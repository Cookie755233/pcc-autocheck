import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import {
  fetchTenderDetails,
  processTenderBatch,
  searchTenders,
} from "@/lib/services/tender-service";
import { db } from "@/lib";
import { serializeData, serializeTenderData } from "@/lib/utils";
import { TenderRecord } from "@/types/tender";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { keywords, dateRangeMonths = 6 } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "At least one keyword is required" },
        { status: 400 }
      );
    }

    console.log(
      `Searching for tenders with ${keywords.length} keywords within ${dateRangeMonths} months`
    );

    // Calculate the date threshold (current date minus the specified months)
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setMonth(now.getMonth() - dateRangeMonths);
    const thresholdTimestamp = thresholdDate.getTime();

    console.log(
      `Date threshold: ${thresholdDate.toISOString()} (${thresholdTimestamp})`
    );

    // Get existing tenders and versions for this user to detect what's new
    const existingViews = await db.tenderView.findMany({
      where: { userId },
      include: {
        tender: {
          include: {
            versions: true,
          },
        },
      },
    });

    // Create maps of existing tenders and versions
    const existingTenderIds = existingViews.map((view) => view.tenderId);
    const existingVersionIds = new Map();

    existingViews.forEach((view) => {
      if (view.tender?.versions) {
        existingVersionIds.set(
          view.tenderId,
          view.tender.versions.map((v) => v.id)
        );
      }
    });

    // Use Web Streams API
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let processedCount = 0;
          let totalFound = 0;
          let allTenders = [];

          // First, search for all tenders across all keywords - this is the optimized part
          for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];

            // Send progress update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  current: i + 1,
                  total: keywords.length,
                  keyword: keyword,
                  log: `🔍 Searching for keyword: "${keyword}"`,
                })}\n\n`
              )
            );

            console.log(`\n🔍 Processing keyword: "${keyword}"`);
            const tenders = await searchTenders(keyword);

            // Add keyword to each tender for tracking
            tenders.forEach((tender) => {
              if (tender) {
                tender.keyword = keyword;
              }
            });

            allTenders.push(...tenders);
            totalFound += tenders.length;

            // Send progress update with count
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  current: i + 1,
                  total: keywords.length,
                  keyword: keyword,
                  log: `📊 Found ${tenders.length} tenders for keyword "${keyword}"`,
                })}\n\n`
              )
            );
          }

          // Deduplicate tenders by their ID
          const uniqueTenders = [];
          const tenderIds = new Set();

          for (const tender of allTenders) {
            if (!tender) continue;

            const tenderId = `unit_id=${tender.unit_id}&job_number=${tender.job_number}`;
            if (!tenderIds.has(tenderId)) {
              tenderIds.add(tenderId);
              uniqueTenders.push(tender);
            }
          }

          console.log(
            `Found ${uniqueTenders.length} unique tenders across all keywords`
          );

          // Process tenders in batches with true concurrency - this is the optimized part
          const batchSize = 5; // Process 5 tenders at a time
          const concurrencyLimit = 3; // Process 3 tenders concurrently

          for (let i = 0; i < uniqueTenders.length; i += batchSize) {
            const batch = uniqueTenders.slice(i, i + batchSize);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  current: i,
                  total: uniqueTenders.length,
                  log: `📊 Processing batch ${
                    Math.floor(i / batchSize) + 1
                  }/${Math.ceil(uniqueTenders.length / batchSize)} (${
                    batch.length
                  } tenders)`,
                })}\n\n`
              )
            );

            // Process tenders in this batch concurrently with limited concurrency
            const queue = [...batch];
            const inProgress: Promise<void>[] = [];
            const results = [];

            async function processNextTender() {
              if (queue.length === 0) return;

              const tender = queue.shift();
              if (!tender) return processNextTender();

              const tenderId = `unit_id=${tender.unit_id}&job_number=${tender.job_number}`;
              console.log(`\n📦 Processing tender: ${tenderId}`);

              try {
                // Fetch tender details with our rate-limited function
                const detailedTender = await fetchTenderDetails(tender);

                if (
                  !detailedTender.records ||
                  detailedTender.records.length === 0
                ) {
                  console.warn(`No versions found for tender ${tenderId}`);
                  return processNextTender();
                }

                // Filter versions by date
                const recentVersions = detailedTender.records.filter(
                  (record) => {
                    if (!record.date) return false;

                    // Parse the YYYYMMDD format date
                    const dateStr = record.date.toString();
                    const year = parseInt(dateStr.substring(0, 4));
                    const month = parseInt(dateStr.substring(4, 6)) - 1;
                    const day = parseInt(dateStr.substring(6, 8));

                    const recordDate = new Date(year, month, day);
                    const recordTimestamp = recordDate.getTime();

                    const isRecent =
                      recordTimestamp >= thresholdTimestamp &&
                      recordTimestamp <= now.getTime();
                    console.log(
                      `Tender ${tenderId} version date: ${recordDate.toISOString()} (${
                        record.date
                      }) - Within range: ${isRecent}`
                    );
                    return isRecent;
                  }
                );

                if (recentVersions.length === 0) {
                  console.log(
                    `Tender ${tenderId} filtered out - no versions within date range`
                  );
                  return processNextTender();
                }

                console.log(
                  `Tender ${tenderId} has ${recentVersions.length} versions within date range`
                );

                // Get or create the tender record
                let storedTender = await db.tender.findUnique({
                  where: { id: tenderId },
                });

                if (storedTender) {
                  // Update existing tender with the keyword if it's not already there
                  const updatedTags = [
                    ...new Set(
                      [...storedTender.tags, tender.keyword].filter(Boolean)
                    ),
                  ] as string[];

                  storedTender = await db.tender.update({
                    where: { id: tenderId },
                    data: {
                      updatedAt: new Date(),
                      tags: {
                        set: updatedTags,
                      },
                    },
                  });
                } else {
                  // Create new tender
                  storedTender = await db.tender.create({
                    data: {
                      id: tenderId,
                      tags: tender.keyword ? [tender.keyword] : [],
                    },
                  });
                }

                // RESTORED: Process filtered versions properly
                for (const record of recentVersions) {
                  console.log(
                    `Processing version: date=${record.date}, type=${
                      record.brief?.type || "Unknown"
                    }`
                  );

                  try {
                    // First check if version exists
                    const existingVersion = await db.tenderVersion.findFirst({
                      where: {
                        tenderId,
                        date: record.date
                          ? BigInt(record.date.toString())
                          : BigInt(0),
                        type: record.brief?.type || "unknown",
                      },
                    });

                    if (!existingVersion) {
                      // Create new version
                      await db.tenderVersion.create({
                        data: {
                          tenderId,
                          date: record.date
                            ? BigInt(record.date.toString())
                            : BigInt(0),
                          type: record.brief?.type || "unknown",
                          data: record,
                        },
                      });
                      console.log(
                        `Created version: ${tenderId}, date: ${
                          record.date
                        }, type: ${record.brief?.type || "unknown"}`
                      );
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: "progress",
                            current: i + 1,
                            total: uniqueTenders.length,
                            log: `✅ New version: ${
                              record.brief?.title?.substring(0, 30) || "Unnamed"
                            }${
                              record.brief?.title?.length > 30 ? "..." : ""
                            } (${record.date})`,
                          })}\n\n`
                        )
                      );
                    } else {
                      console.log(
                        `Version already exists: ${tenderId}, date: ${
                          record.date
                        }, type: ${record.brief?.type || "unknown"}`
                      );
                    }
                  } catch (error) {
                    console.error(
                      `Error saving version for ${tenderId}, date ${record.date}:`,
                      error
                    );
                  }
                }

                // RESTORED: Create or update user view
                await db.tenderView.upsert({
                  where: {
                    userId_tenderId: { userId, tenderId },
                  },
                  update: {},
                  create: {
                    userId,
                    tenderId,
                    isArchived: false,
                  },
                });

                // RESTORED: Get the complete tender data with all relations
                const savedTender = await db.tender.findUnique({
                  where: { id: tenderId },
                  include: {
                    versions: {
                      orderBy: { date: "desc" },
                    },
                  },
                });

                if (savedTender) {
                  console.log(`✅ Preparing to stream tender: ${tenderId}`);

                  // Check if this tender is completely new or has new versions
                  const isCompletelyNew = !existingTenderIds.includes(tenderId);
                  const hasNewVersionsOnly =
                    !isCompletelyNew &&
                    savedTender.versions.some(
                      (v) => !existingVersionIds.get(tenderId)?.includes(v.id)
                    );

                  // Get the latest version data
                  const latestVersion = savedTender.versions[0];

                  // RESTORED: Prepare the tender data with proper structure
                  const tenderData = serializeTenderData({
                    tender: {
                      ...savedTender,
                      id: tenderId,
                      unit_id: tender.unit_id,
                      job_number: tender.job_number,
                      date: latestVersion?.date || BigInt(Date.now()),
                      title: latestVersion?.data?.brief?.title || "No title",
                      isArchived: false,
                      isHighlighted: false,
                      brief: latestVersion?.data?.brief || {},
                    },
                    versions: savedTender.versions.map((v) => ({
                      ...v,
                      date: v.date.toString(),
                      data: {
                        ...v.data,
                        brief: v.data?.brief || {},
                      },
                    })),
                    relatedTenders: [],
                    isNew: isCompletelyNew,
                    hasNewVersions: hasNewVersionsOnly,
                  });

                  // RESTORED: Stream the complete tender data to client
                  const message = `data: ${JSON.stringify(tenderData)}\n\n`;
                  controller.enqueue(encoder.encode(message));

                  // Add to our results
                  results.push(savedTender);

                  // Log status
                  const statusLog = isCompletelyNew
                    ? `🆕 New tender: ${
                        latestVersion?.data?.brief?.title?.substring(0, 30) ||
                        "Unnamed"
                      }${
                        latestVersion?.data?.brief?.title?.length > 30
                          ? "..."
                          : ""
                      }`
                    : hasNewVersionsOnly
                    ? `📝 Updated tender: ${
                        latestVersion?.data?.brief?.title?.substring(0, 30) ||
                        "Unnamed"
                      }${
                        latestVersion?.data?.brief?.title?.length > 30
                          ? "..."
                          : ""
                      }`
                    : `ℹ️ Existing tender: ${
                        latestVersion?.data?.brief?.title?.substring(0, 30) ||
                        "Unnamed"
                      }${
                        latestVersion?.data?.brief?.title?.length > 30
                          ? "..."
                          : ""
                      }`;

                  console.log(statusLog);
                } else {
                  console.log(`⚠️ No saved tender found for: ${tenderId}`);
                }
              } catch (error) {
                console.error(`Error processing tender ${tenderId}:`, error);
              }

              // Process next tender in queue
              return processNextTender();
            }

            // Start initial batch of promises
            while (inProgress.length < concurrencyLimit && queue.length > 0) {
              const promise = processNextTender();
              inProgress.push(promise);

              // Remove promise from inProgress when it resolves
              promise.then(() => {
                const index = inProgress.indexOf(promise);
                if (index !== -1) inProgress.splice(index, 1);
              });
            }

            // Wait for all promises in this batch to resolve
            await Promise.all(inProgress);

            // Update progress
            processedCount += batch.length;
          }

          // Send completion message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                totalFound,
                processedCount,
                log: `✨ Finished processing all keywords`,
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Error in stream:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : String(error),
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in search route:", error);
    return NextResponse.json(
      { error: "Failed to search tenders" },
      { status: 500 }
    );
  }
}
