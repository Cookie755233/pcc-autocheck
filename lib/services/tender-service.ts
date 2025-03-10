import { db } from "@/lib";
import { Tender, TenderRecord, APIResponse } from "@/types/tender";
import { userService } from "./user-service";

//@ Sleep function to add delay between API calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//@ Configurable API request parameters
const API_CONFIG = {
  DEFAULT_DELAY: 500, // 500ms delay between requests (reduced from 1000ms)
  MAX_RETRY_COUNT: 3, // Maximum number of retries
  RETRY_DELAY: 1500, // Initial retry delay (reduced from 2000ms)
  BACKOFF_FACTOR: 1.5, // Exponential backoff multiplier
  BATCH_SIZE: 5, // Process 5 tenders at a time (increased from 3)
  CONCURRENCY_LIMIT: 3, // Maximum number of concurrent API calls
};

//@ Fetch with retry and rate limiting
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryCount = 0
): Promise<Response> {
  try {
    // Add delay before each request to avoid rate limiting
    await sleep(API_CONFIG.DEFAULT_DELAY);

    const response = await fetch(url, options);

    if (!response.ok) {
      // If we've reached max retries, throw the error
      if (retryCount >= API_CONFIG.MAX_RETRY_COUNT) {
        throw new Error(
          `API request failed after ${retryCount} retries: ${response.status} ${response.statusText}`
        );
      }

      // Calculate backoff delay
      const backoffDelay =
        API_CONFIG.RETRY_DELAY *
        Math.pow(API_CONFIG.BACKOFF_FACTOR, retryCount);
      console.log(
        `⚠️ API request failed with ${
          response.status
        }. Retrying in ${backoffDelay}ms... (${retryCount + 1}/${
          API_CONFIG.MAX_RETRY_COUNT
        })`
      );

      // Wait for backoff period
      await sleep(backoffDelay);

      // Retry with incremented retry count
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount >= API_CONFIG.MAX_RETRY_COUNT) {
      console.error(`❌ Max retries exceeded for ${url}:`, error);
      throw error;
    }

    // Calculate backoff delay for network errors
    const backoffDelay =
      API_CONFIG.RETRY_DELAY * Math.pow(API_CONFIG.BACKOFF_FACTOR, retryCount);
    console.log(
      `⚠️ Network error. Retrying in ${backoffDelay}ms... (${retryCount + 1}/${
        API_CONFIG.MAX_RETRY_COUNT
      })`
    );

    // Wait for backoff period
    await sleep(backoffDelay);

    // Retry with incremented retry count
    return fetchWithRetry(url, options, retryCount + 1);
  }
}

//@ Search tenders from the API
export async function searchTenders(query: string): Promise<Tender[]> {
  const response = await fetchWithRetry(
    `https://pcc.g0v.ronny.tw/api/searchbytitle?query=${encodeURIComponent(
      query
    )}`
  );

  const data = await response.json();
  const allTenders = data.records || [];

  // Return the tenders without fetching details - we'll do that in the route handler
  return allTenders.map((tender: any) => ({
    ...tender,
    // Add an empty records array to satisfy TypeScript
    records: [],
  }));
}

//@ Fetch tender details with rate limiting
export async function fetchTenderDetails(tender: Tender): Promise<Tender> {
  try {
    const detailResponse = await fetchWithRetry(
      `https://pcc.g0v.ronny.tw/api/tender?unit_id=${tender.unit_id}&job_number=${tender.job_number}`
    );

    const detailData = await detailResponse.json();

    // Return all records instead of just the first one
    return {
      ...tender,
      records: detailData.records || [],
    };
  } catch (error) {
    console.error(
      `Failed to fetch details for tender ${tender.job_number}:`,
      error
    );
    // Return original tender if we can't get details
    return {
      ...tender,
      records: [],
    };
  }
}

//@ Process a batch of tenders concurrently with a concurrency limit
export async function processTenderBatch(
  tenders: Tender[],
  concurrencyLimit = API_CONFIG.CONCURRENCY_LIMIT
): Promise<Tender[]> {
  const results: Tender[] = [];
  const queue = [...tenders];
  const inProgress: Promise<void>[] = [];

  async function processNext(): Promise<void> {
    if (queue.length === 0) return;

    const tender = queue.shift()!;
    try {
      const detailedTender = await fetchTenderDetails(tender);
      results.push(detailedTender);
    } catch (error) {
      console.error(`Error processing tender ${tender.job_number}:`, error);
      // Still add the original tender to results even if fetching details failed
      results.push(tender);
    }

    // Process next item in queue
    return processNext();
  }

  // Start initial batch of promises
  while (inProgress.length < concurrencyLimit && queue.length > 0) {
    const promise = processNext();
    inProgress.push(promise);

    // Remove promise from inProgress when it resolves
    promise.then(() => {
      const index = inProgress.indexOf(promise);
      if (index !== -1) inProgress.splice(index, 1);
    });
  }

  // Wait for all promises to resolve
  await Promise.all(inProgress);

  return results;
}

//@ Filter tender details based on type
function filterDetailsByType(type: string, detail: any) {
  const baseFields = {
    "機關資料:機關名稱": detail["機關資料:機關名稱"],
    "機關資料:單位名稱": detail["機關資料:單位名稱"],
    "機關資料:聯絡人": detail["機關資料:聯絡人"],
    "機關資料:聯絡電話": detail["機關資料:聯絡電話"],
  };

  // Bidding: 招標公告
  if (type.includes("招標")) {
    return {
      ...baseFields,
      // Bidding specific fields
      "採購資料:預算金額":
        detail["已公告資料:預算金額"] || detail["採購資料:預算金額"],
      "採購資料:預計金額是否公開":
        detail["已公告資料:預算金額是否公開"] ||
        detail["採購資料:預計金額是否公開"],
      "招標資料:招標方式":
        detail["已公告資料:招標方式"] || detail["招標資料:招標方式"],
      "招標資料:決標方式":
        detail["已公告資料:決標方式"] || detail["招標資料:決標方式"],
      "招標資料:是否訂有底價":
        detail["已公告資料:是否訂有底價"] || detail["招標資料:是否訂有底價"],
      "招標資料:價格是否納入評選":
        detail["已公告資料:價格是否納入評選"] ||
        detail["招標資料:價格是否納入評選"],
      "招標資料:招標狀態":
        detail["已公告資料:招標狀態"] || detail["招標資料:招標狀態"],
      "招標資料:公告日":
        detail["已公告資料:公告日"] || detail["招標資料:公告日"],
      "領投開標:截止投標":
        detail["已公告資料:截止投標"] || detail["領投開標:截止投標"],
      "領投開標:開標時間":
        detail["已公告資料:開標時間"] || detail["領投開標:開標時間"],
      "領投開標:收受投標文件地點":
        detail["已公告資料:收受投標文件地點"] ||
        detail["領投開標:收受投標文件地點"],
    };
  }

  // Award: 決標公告
  if (type.includes("決標")) {
    // Get all vendor and item fields
    const vendorFields = Object.entries(detail)
      .filter(([key]) => key.startsWith("投標廠商:"))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const itemFields = Object.entries(detail)
      .filter(([key]) => key.startsWith("決標品項:"))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    return {
      ...baseFields,
      // Award specific fields
      "決標資料:總決標金額": detail["決標資料:總決標金額"],
      "決標資料:總決標金額是否公開": detail["決標資料:總決標金額是否公開"],
      "決標資料:底價金額": detail["決標資料:底價金額"],
      "決標資料:決標日期": detail["決標資料:決標日期"],
      // Include all vendor and item fields
      ...vendorFields,
      ...itemFields,
      // Save the companies data structure for easier access
      companies: detail.companies || {},
    };
  }

  // Failed: 無法決標公告
  if (type.includes("無法決標")) {
    return {
      ...baseFields,
      // Failed specific fields
      "無法決標公告:無法決標的理由": detail["無法決標公告:無法決標的理由"],
      "無法決標公告:是否沿用本案號及原招標方式續行招標":
        detail["無法決標公告:是否沿用本案號及原招標方式續行招標"],
      "無法決標公告:無法決標公告日期": detail["無法決標公告:無法決標公告日期"],
    };
  }

  return baseFields;
}

//@ Process and store tenders from API response
export async function processTenders(keywords: string[], userId: string) {
  if (!keywords?.length) {
    throw new Error("Keywords are required");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    // Ensure user exists in database
    await userService.ensureUser(userId);

    // Check subscription status for keyword limits
    const user = await userService.getUserWithSubscription(userId);
    const isProUser =
      user?.subscriptionTier === "pro" && user?.subscriptionStatus === "ACTIVE";

    // Limit keywords for free users
    let processKeywords = keywords;
    if (!isProUser && keywords.length > 5) {
      processKeywords = keywords.slice(0, 5);
      console.log(`User ${userId} is on free plan. Limiting to 5 keywords.`);
    }

    // Define proper type for results
    const results: {
      tender: any;
      versions: any[];
    }[] = [];

    for (const keyword of processKeywords) {
      // console.log(`Processing keyword: ${keyword}`)
      const tenders = await searchTenders(keyword);
      // console.log(`Found ${tenders.length} tenders for keyword "${keyword}"`)

      for (const tender of tenders) {
        const tenderId = `unit_id=${tender.unit_id}&job_number=${tender.job_number}`;

        try {
          // Debug log the raw tender data
          console.log("\n📥 Raw Tender Data:", {
            tenderId,
            type: tender.brief?.type,
            recordCount: tender.records?.length || 0,
          });

          // First check if the tender already exists
          const existingTender = await db.tender.findUnique({
            where: { id: tenderId },
            include: { versions: true },
          });

          // Create or update the tender
          try {
            // First create/update the tender record
            const storedTender = await db.tender.upsert({
              where: { id: tenderId },
              create: {
                id: tenderId,
                tags: [keyword],
              },
              update: {
                tags: existingTender
                  ? Array.from(new Set([...existingTender.tags, keyword]))
                  : [keyword],
              },
            });

            // Then handle versions separately to avoid unique constraint errors
            for (const record of tender.records || []) {
              try {
                // Check if this version already exists
                const existingVersion = await db.tenderVersion.findFirst({
                  where: {
                    tenderId,
                    date: BigInt(record.date),
                    type: record.brief?.type || "unknown",
                  },
                });

                // Only create if it doesn't exist
                if (!existingVersion) {
                  await db.tenderVersion.create({
                    data: {
                      tenderId,
                      date: BigInt(record.date),
                      type: record.brief?.type || "unknown",
                      data: record,
                    },
                  });
                  console.log(
                    `Created version: ${tenderId}, date: ${
                      record.date
                    }, type: ${record.brief?.type || "unknown"}`
                  );
                } else {
                  console.log(
                    `Version already exists: ${tenderId}, date: ${
                      record.date
                    }, type: ${record.brief?.type || "unknown"}`
                  );
                }
              } catch (versionError) {
                console.error(
                  `Error processing version for ${tenderId}, date ${record.date}:`,
                  versionError
                );
                // Continue with other versions even if one fails
              }
            }

            // Create or update user view
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

            // Add to results if not already there
            if (!results.find((r) => r.tender.id === tenderId)) {
              results.push({
                tender: {
                  ...tender,
                  id: tenderId,
                  tags: storedTender.tags,
                },
                versions: await db.tenderVersion.findMany({
                  where: { tenderId },
                  orderBy: { date: "desc" },
                }),
                relatedTenders: [],
              });
            }
          } catch (error) {
            console.error(`Error processing tender:`, error);
            // Continue with other tenders even if one fails
          }
        } catch (error) {
          console.error(`Error processing tender:`, error);
        }
      }
    }

    // Broadcast update to refresh Kanban
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("tender-updates");
      channel.postMessage("refresh");
    }

    return results;
  } catch (error) {
    console.error("Error processing tenders:", error);
    throw error;
  }
}

//@ Get user's tenders with versions
export async function getUserTendersWithVersions(userId: string) {
  return db.tenderView.findMany({
    where: { userId },
    include: {
      tender: {
        include: {
          versions: {
            orderBy: {
              date: "desc",
            },
          },
        },
      },
    },
  });
}

//@ Helper function to extract tags from tender data
function extractTags(tenderData: any, keyword?: string): string[] {
  const tags = new Set<string>();

  // Add keyword as a tag if provided
  if (keyword) {
    tags.add(`keyword:${keyword}`);
  }

  // Add tender type
  if (tenderData.brief?.type) {
    tags.add(`type:${tenderData.brief.type}`);
  }

  // Add tender category
  if (tenderData.brief?.category) {
    tags.add(`category:${tenderData.brief.category}`);
  }

  // Add organization
  if (tenderData.unit_name) {
    tags.add(`org:${tenderData.unit_name}`);
  }

  return Array.from(tags);
}

//@ Tender view service
export const tenderViewService = {
  //@ Toggle archive status
  async toggleArchive(userId: string, tenderId: string, isArchived: boolean) {
    return db.tenderView.update({
      where: {
        userId_tenderId: { userId, tenderId },
      },
      data: { isArchived },
    });
  },

  //@ Get archived tenders
  async getArchived(userId: string) {
    return db.tenderView.findMany({
      where: {
        userId,
        isArchived: true,
      },
      include: {
        tender: {
          include: {
            versions: {
              orderBy: {
                date: "desc",
              },
            },
          },
        },
      },
    });
  },

  //@ Get unarchived tenders
  async getUnarchived(userId: string) {
    return db.tenderView.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        tender: {
          include: {
            versions: {
              orderBy: {
                date: "desc",
              },
            },
          },
        },
      },
    });
  },
};

//@ Tender service for saving and managing tenders
export const tenderService = {
  //@ Save a tender with proper versioning
  async saveTender(tenderData: any, userId: string) {
    const tenderId = `unit_id=${tenderData.unit_id}&job_number=${tenderData.job_number}`;

    console.log("Saving tender:", { tenderId, userId });

    try {
      //@ Create enriched data structure
      const enrichedData = {
        // Basic info from API response
        url: tenderData.url,
        date: tenderData.date,
        unit_id: tenderData.unit_id,
        unit_name: tenderData.unit_name,
        filename: tenderData.filename,
        job_number: tenderData.job_number,

        // Tender details
        brief: {
          title: tenderData.brief?.title,
          type: tenderData.brief?.type,
          category: tenderData.brief?.category,
          content: tenderData.brief?.content,
        },

        // Detailed tender information
        detail: {
          // 機關資料
          "機關資料:機關名稱": tenderData.detail?.["機關資料:機關名稱"],
          "機關資料:單位名稱": tenderData.detail?.["機關資料:單位名稱"],
          "機關資料:聯絡人": tenderData.detail?.["機關資料:聯絡人"],
          "機關資料:聯絡電話": tenderData.detail?.["機關資料:聯絡電話"],
          "機關資料:傳真號碼": tenderData.detail?.["機關資料:傳真號碼"],

          // 採購資料
          "採購資料:預算金額": tenderData.detail?.["採購資料:預算金額"],
          "採購資料:預計金額是否公開":
            tenderData.detail?.["採購資料:預計金額是否公開"],
          "採購資料:標的分類": tenderData.detail?.["採購資料:標的分類"],
          "採購資料:履約地點": tenderData.detail?.["採購資料:履約地點"],

          // 招標資料
          "招標資料:招標方式": tenderData.detail?.["招標資料:招標方式"],
          "招標資料:決標方式": tenderData.detail?.["招標資料:決標方式"],
          "招標資料:是否訂有底價": tenderData.detail?.["招標資料:是否訂有底價"],
          "招標資料:價格是否納入評選":
            tenderData.detail?.["招標資料:價格是否納入評選"],
          "招標資料:招標狀態": tenderData.detail?.["招標資料:招標狀態"],
          "招標資料:公告日": tenderData.detail?.["招標資料:公告日"],

          // 領投開標
          "領投開標:截止投標": tenderData.detail?.["領投開標:截止投標"],
          "領投開標:開標時間": tenderData.detail?.["領投開標:開標時間"],
          "領投開標:收受投標文件地點":
            tenderData.detail?.["領投開標:收受投標文件地點"],

          // 決標資料
          "決標資料:總決標金額": tenderData.detail?.["決標資料:總決標金額"],
          "決標資料:總決標金額是否公開":
            tenderData.detail?.["決標資料:總決標金額是否公開"],
          "決標資料:底價金額": tenderData.detail?.["決標資料:底價金額"],
          "決標資料:決標日期": tenderData.detail?.["決標資料:決標日期"],

          // 無法決標資料
          "無法決標公告:無法決標的理由":
            tenderData.detail?.["無法決標公告:無法決標的理由"],
          "無法決標公告:標的分類": tenderData.detail?.["無法決標公告:標的分類"],
          "無法決標公告:招標方式": tenderData.detail?.["無法決標公告:招標方式"],
          "無法決標公告:是否複數決標":
            tenderData.detail?.["無法決標公告:是否複數決標"],
          "無法決標公告:是否沿用本案號及原招標方式續行招標":
            tenderData.detail?.[
              "無法決標公告:是否沿用本案號及原招標方式續行招標"
            ],
          "無法決標公告:原招標公告之刊登採購公報日期":
            tenderData.detail?.["無法決標公告:原招標公告之刊登採購公報日期"],
          "無法決標公告:無法決標公告日期":
            tenderData.detail?.["無法決標公告:無法決標公告日期"],

          // 得標廠商資訊
          ...Object.fromEntries(
            Object.entries(tenderData.detail || {}).filter(
              ([key]) =>
                key.startsWith("投標廠商:") || key.startsWith("決標品項:")
            )
          ),

          // Original URL
          url: tenderData.detail?.url || tenderData.url,
        },
      };

      //@ Get or create the tender
      const tender = await db.tender.upsert({
        where: { id: tenderId },
        update: {
          updatedAt: new Date(),
          tags: {
            set: extractTags(tenderData),
          },
        },
        create: {
          id: tenderId,
          tags: {
            set: extractTags(tenderData),
          },
        },
      });

      //@ Process the tender data to create enriched version
      const processedData = this.processTenderData(tenderData);

      if (!processedData) {
        console.error("Failed to process tender data:", tenderData);
        return null;
      }

      //@ Create new version with enriched data
      const version = await db.tenderVersion.create({
        data: {
          tenderId,
          date: BigInt(processedData.date),
          type: processedData.type,
          data: processedData.enrichedData,
        },
      });

      //@ Create or update tender view
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

      return tender;
    } catch (error) {
      console.error("Error saving tender:", error);
      throw error;
    }
  },

  //@ Process and extract failure data from tender details
  extractFailureData(detail: any) {
    if (!detail) return null;

    // Check if this is a failed tender announcement
    const isFailedTender =
      detail.type === "無法決標公告" ||
      detail.type2 === "無法決標" ||
      (detail.brief?.type && detail.brief.type.includes("無法決標"));

    if (!isFailedTender) return null;

    //! Debug log for failure data extraction
    console.log("Extracting failure data from:", {
      type: detail.type,
      type2: detail.type2,
      briefType: detail.brief?.type,
    });

    return {
      reason:
        detail["無法決標公告:無法決標的理由"] ||
        detail["無法決標資料:無法決標的理由"],
      failureDate:
        detail["無法決標公告:無法決標公告日期"] ||
        detail["無法決標資料:無法決標日期"],
      nextAction:
        detail["無法決標公告:是否沿用本案號及原招標方式續行招標"] ||
        detail["無法決標資料:是否沿用本案號及原招標方式續行招標"],
    };
  },

  //@ Process and extract award data from tender details
  extractAwardData(detail: any) {
    if (!detail) return null;

    // Check if this is an award announcement
    const isAwardTender =
      (detail.type && detail.type.includes("決標")) ||
      (detail.brief?.type && detail.brief.type.includes("決標"));

    if (!isAwardTender) return null;

    //! Debug log for award data extraction
    console.log("Extracting award data from:", {
      type: detail.type,
      briefType: detail.brief?.type,
      hasDecisionInfo: !!detail["決標資料:總決標金額"],
      fields: Object.keys(detail).filter(
        (k) => k.includes("決標") || k.includes("投標")
      ),
    });

    // Extract companies information
    const companies = this.extractCompanies(detail);

    // Try multiple possible field paths for award data
    const totalAmount =
      detail["決標資料:總決標金額"] ||
      detail["已公告資料:預算金額"] ||
      "unknown";

    const isPublic =
      detail["決標資料:總決標金額是否公開"] ||
      (detail["已公告資料:預算金額是否公開"] === "是" ? "是" : "否") ||
      "unknown";

    const basePrice = detail["決標資料:底價金額"] || "unknown";

    const awardDate = detail["決標資料:決標日期"] || "unknown";

    // Find winning vendor
    let winner = "unknown";
    let winningBid = "unknown";

    // Look for any bidder that is marked as winner
    for (let i = 1; i <= 10; i++) {
      const bidderKey = `投標廠商:投標廠商${i}:廠商名稱`;
      const isWinnerKey = `投標廠商:投標廠商${i}:是否得標`;
      const amountKey = `投標廠商:投標廠商${i}:決標金額`;

      if (detail[bidderKey] && detail[isWinnerKey] === "是") {
        winner = detail[bidderKey];
        winningBid = detail[amountKey] || totalAmount;
        break;
      }
    }

    // If no winner found in bidders, check 決標品項
    if (winner === "unknown") {
      const itemKeys = Object.keys(detail).filter((k) =>
        k.match(/決標品項:第\d+品項:得標廠商\d+:得標廠商/)
      );

      for (const key of itemKeys) {
        const matches = key.match(
          /決標品項:第(\d+)品項:得標廠商(\d+):得標廠商/
        );
        if (!matches) continue;

        const [_, itemIndex, vendorIndex] = matches;
        winner = detail[key];
        winningBid =
          detail[
            `決標品項:第${itemIndex}品項:得標廠商${vendorIndex}:決標金額`
          ] || totalAmount;
        break;
      }
    }

    // Return the data in a format compatible with awarded-layout.tsx
    return {
      totalAmount,
      isPublic,
      basePrice,
      awardDate,
      winner,
      winningBid,
      companies, // Include the companies data structure for the awarded-layout
    };
  },

  //@ Process tender data to create enriched version
  processTenderData(tenderData: any) {
    if (!tenderData) return null;

    try {
      //! Important: Check if we have a detail object directly or need to extract from records
      const detail = tenderData.detail || {};
      const type = tenderData.brief?.type || detail.type || "未知";

      // Create enriched data with all available information
      const enrichedData: any = {
        ...tenderData,
        enrichedData: {},
      };

      // Extract companies information from detail
      const companies = this.extractCompanies(detail);
      if (companies && Object.keys(companies).length > 0) {
        console.log("Found companies data:", companies);
        enrichedData.companies = companies;
      }

      //? Check for award data in the current record
      const awardData = this.extractAwardData(detail);
      if (awardData) {
        console.log("Found award data:", awardData);
        enrichedData.enrichedData.awardData = awardData;

        // Also add companies data to the root level for the awarded-layout.tsx
        if (awardData.companies) {
          enrichedData.companies = awardData.companies;
        }
      }

      //? Check for failure data in the current record
      const failureData = this.extractFailureData(detail);
      if (failureData) {
        console.log("Found failure data:", failureData);
        enrichedData.enrichedData.failureData = failureData;
      }

      return {
        date: BigInt(tenderData.date || 0),
        type,
        enrichedData,
      };
    } catch (error) {
      console.error("Error processing tender data:", error);
      return null;
    }
  },

  //@ Save tender versions with enriched data
  async saveTenderVersions(tenderId: string, tenderData: any[]) {
    try {
      //@ Process each tender version
      const results = [];
      for (const data of tenderData) {
        const processedData = this.processTenderData(data);

        if (!processedData) {
          console.error("Failed to process tender data:", data);
          continue;
        }

        try {
          // First check if version exists
          const existingVersion = await db.tenderVersion.findFirst({
            where: {
              tenderId,
              date: BigInt(processedData.date),
            },
          });

          if (!existingVersion) {
            // Create new version - DO NOT use upsert with non-existent compound key
            const version = await db.tenderVersion.create({
              data: {
                tenderId,
                date: BigInt(processedData.date),
                type: processedData.type,
                data: processedData.enrichedData,
              },
            });

            console.log("Created new tender version:", {
              tenderId,
              date: processedData.date,
              type: processedData.type,
            });

            results.push(version);
          } else {
            console.log("Version already exists, skipping:", {
              tenderId,
              date: processedData.date,
              type: processedData.type,
            });
            results.push(existingVersion);
          }
        } catch (error) {
          console.error("Error saving version:", error);
        }
      }

      return results;
    } catch (error) {
      console.error("Error saving tender versions:", error);
      throw error;
    }
  },

  // Search for tenders by keywords and save them to the database
  async fetchAndSaveTendersByKeywords(keywords: string[], userId: string) {
    if (!keywords?.length) {
      throw new Error("Keywords are required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      await userService.ensureUser(userId);
      const results: { tender: any; versions: any[] }[] = [];

      for (const keyword of keywords) {
        console.log(`Processing keyword: ${keyword}`);
        const tenders = await this.searchTenders(keyword);
        console.log(`Found ${tenders.length} tenders for keyword "${keyword}"`);

        for (const tender of tenders) {
          try {
            const tenderId = `unit_id=${tender.unit_id}&job_number=${tender.job_number}`;
            console.log(`📥 Processing tender: ${tenderId}`);

            // Fetch all versions for this tender
            const response = await fetch(
              `https://pcc.g0v.ronny.tw/api/tender?unit_id=${tender.unit_id}&job_number=${tender.job_number}`
            );

            if (!response.ok) {
              console.error(`Failed to fetch versions for tender ${tenderId}`);
              continue;
            }

            const data = await response.json();
            console.log(
              `Found ${
                data.records?.length || 0
              } versions for tender ${tenderId}`
            );

            if (!data.records || data.records.length === 0) {
              console.warn(`No versions found for tender ${tenderId}`);
              continue;
            }

            // Get or create the tender record
            const storedTender = await db.tender.upsert({
              where: { id: tenderId },
              update: {
                updatedAt: new Date(),
                tags: {
                  set: [...new Set([...extractTags(tender), keyword])],
                },
              },
              create: {
                id: tenderId,
                tags: {
                  set: [...new Set([...extractTags(tender), keyword])],
                },
              },
            });

            // Process ALL versions - this is the key fix
            for (const record of data.records) {
              console.log(
                `📦 Processing version: date=${record.date}, type=${
                  record.brief?.type || "Unknown"
                }`
              );

              const processedData = this.processTenderData(record);
              if (!processedData) {
                console.error(
                  `Failed to process tender data for ${tenderId}, version date ${record.date}`
                );
                continue;
              }

              try {
                // First check if version exists
                const existingVersion = await db.tenderVersion.findFirst({
                  where: {
                    tenderId,
                    date: BigInt(record.date),
                    type: record.brief?.type || "unknown",
                  },
                });

                if (!existingVersion) {
                  // Create new version
                  await db.tenderVersion.create({
                    data: {
                      tenderId,
                      date: BigInt(record.date),
                      type: processedData.type,
                      data: processedData.enrichedData,
                    },
                  });
                  console.log(
                    `Created version: ${tenderId}, date: ${record.date}, type: ${processedData.type}`
                  );
                } else {
                  console.log(
                    `Version already exists: ${tenderId}, date: ${record.date}, type: ${processedData.type}`
                  );
                }
              } catch (error) {
                console.error(
                  `Error saving version for ${tenderId}, date ${record.date}:`,
                  error
                );
              }
            }

            // Create or update user view
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

            if (!results.find((r) => r.tender.id === tenderId)) {
              results.push({
                tender: storedTender,
                versions: await db.tenderVersion.findMany({
                  where: { tenderId },
                  orderBy: { date: "desc" },
                }),
              });
            }
          } catch (error) {
            console.error(`Error processing tender:`, error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error fetching tenders by keywords:", error);
      throw error;
    }
  },

  // Add searchTenders as a method on the tenderService object
  async searchTenders(query: string): Promise<Tender[]> {
    return searchTenders(query); // Call the imported function
  },

  //@ Extract companies information from tender detail
  extractCompanies(detail: any) {
    if (!detail) return null;

    const companies = {
      ids: [] as string[],
      names: [] as string[],
      addresses: [] as string[],
      phones: [] as string[],
      periods: [] as string[],
      id_key: {} as Record<string, string[]>,
      name_key: {} as Record<string, string[]>,
    };

    // Extract bidder information
    const bidderKeys = Object.keys(detail).filter((k) =>
      k.match(/投標廠商:投標廠商\d+:廠商名稱/)
    );

    for (const key of bidderKeys) {
      const index = key.match(/投標廠商:投標廠商(\d+):廠商名稱/)?.[1];
      if (!index) continue;

      const name = detail[key];
      const id = detail[`投標廠商:投標廠商${index}:廠商代碼`];
      const address = detail[`投標廠商:投標廠商${index}:廠商地址`];
      const phone = detail[`投標廠商:投標廠商${index}:廠商電話`];
      const period = detail[`投標廠商:投標廠商${index}:履約起迄日期`];

      if (name) {
        companies.names.push(name);
        if (id) {
          companies.ids.push(id);
          companies.id_key[id] = [...(companies.id_key[id] || []), key];
        }
        companies.name_key[name] = [...(companies.name_key[name] || []), key];

        if (address) companies.addresses.push(address);
        else companies.addresses.push("");

        if (phone) companies.phones.push(phone);
        else companies.phones.push("");

        if (period) companies.periods.push(period);
        else companies.periods.push("");
      }
    }

    return companies;
  },

  // Add this function to filter versions by date
  async saveTenderWithDateFilter(
    tender: any,
    userId: string,
    thresholdTimestamp: number
  ): Promise<any> {
    // Check if any version is within the date range
    const filteredVersions = tender.versions.filter((version: any) => {
      const versionDate = Number(version.date);
      const isRecent = versionDate >= thresholdTimestamp;
      console.log(
        `Checking version date ${version.date} (${new Date(
          versionDate
        ).toISOString()}) against threshold ${thresholdTimestamp} (${new Date(
          thresholdTimestamp
        ).toISOString()}) - isRecent: ${isRecent}`
      );
      return isRecent;
    });

    if (filteredVersions.length === 0) {
      console.log(
        `Tender ${tender.id} skipped - no versions within date range`
      );
      return null;
    }

    console.log(
      `Saving tender ${tender.id} with ${filteredVersions.length} versions (filtered from ${tender.versions.length})`
    );

    // Continue with saving the tender but only with the filtered versions
    // Your existing code to save the tender...

    return savedTender;
  },
};
