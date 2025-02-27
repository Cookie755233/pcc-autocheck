import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { processTenders, searchTenders } from '@/lib/services/tender-service'
import { db } from '@/lib'
import { serializeData, serializeTenderData } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { keywords, dateRangeMonths = 6 } = await req.json()
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required' },
        { status: 400 }
      )
    }

    console.log(`Searching for tenders with ${keywords.length} keywords within ${dateRangeMonths} months`)
    
    // Calculate the date threshold (current date minus the specified months)
    const now = new Date()
    const thresholdDate = new Date()
    thresholdDate.setMonth(now.getMonth() - dateRangeMonths)
    const thresholdTimestamp = thresholdDate.getTime()
    
    console.log(`Date threshold: ${thresholdDate.toISOString()} (${thresholdTimestamp})`)

    // Get existing tenders and versions for this user to detect what's new
    const existingViews = await db.tenderView.findMany({
      where: { userId },
      include: {
        tender: {
          include: {
            versions: true
          }
        }
      }
    })
    
    // Create maps of existing tenders and versions
    const existingTenderIds = existingViews.map(view => view.tenderId)
    const existingVersionIds = new Map()
    
    existingViews.forEach(view => {
      if (view.tender?.versions) {
        existingVersionIds.set(
          view.tenderId, 
          view.tender.versions.map(v => v.id)
        )
      }
    })

    // Use Web Streams API
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let processedCount = 0;
          let totalFound = 0;

          for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            
            // Send progress update
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'progress',
                  current: i + 1,
                  total: keywords.length
                })}\n\n`
              )
            );
            
            console.log(`\n🔍 Processing keyword: "${keyword}"`);
            const tenders = await searchTenders(keyword);
            totalFound += tenders.length;
            
            for (const tender of tenders) {
              const tenderId = `unit_id=${tender.unit_id}&job_number=${tender.job_number}`;
              console.log(`\n📦 Processing tender: ${tenderId}`);
              
              try {
                // Fetch all versions for this tender
                const response = await fetch(
                  `https://pcc.g0v.ronny.tw/api/tender?unit_id=${tender.unit_id}&job_number=${tender.job_number}`
                )
                
                if (!response.ok) {
                  console.error(`Failed to fetch versions for tender ${tenderId}`)
                  continue
                }
                
                const data = await response.json()
                console.log(`Found ${data.records?.length || 0} versions for tender ${tenderId}`)
                
                if (!data.records || data.records.length === 0) {
                  console.warn(`No versions found for tender ${tenderId}`)
                  continue
                }
                
                // Filter versions by date
                const recentVersions = data.records.filter((record: { date: number | string }) => {
                  // Parse the YYYYMMDD format date
                  const dateStr = record.date.toString();
                  const year = parseInt(dateStr.substring(0, 4));
                  const month = parseInt(dateStr.substring(4, 6)) - 1;
                  const day = parseInt(dateStr.substring(6, 8));
                  
                  const recordDate = new Date(year, month, day);
                  const recordTimestamp = recordDate.getTime();
                  
                  const isRecent = recordTimestamp >= thresholdTimestamp && recordTimestamp <= now.getTime();
                  console.log(`Tender ${tenderId} version date: ${recordDate.toISOString()} (${record.date}) - Within range: ${isRecent}`);
                  return isRecent;
                });
                
                if (recentVersions.length === 0) {
                  console.log(`Tender ${tenderId} filtered out - no versions within date range`)
                  continue
                }
                
                console.log(`Tender ${tenderId} has ${recentVersions.length} versions within date range`)
                
                // Get or create the tender record
                let storedTender = await db.tender.findUnique({
                  where: { id: tenderId }
                })
                
                if (storedTender) {
                  // Update existing tender
                  storedTender = await db.tender.update({
                    where: { id: tenderId },
                    data: {
                      updatedAt: new Date(),
                      tags: {
                        set: [...new Set([...storedTender.tags, keyword])]
                      }
                    }
                  })
                } else {
                  // Create new tender
                  storedTender = await db.tender.create({
                    data: {
                      id: tenderId,
                      tags: [keyword]
                    }
                  })
                }
                
                // Process filtered versions
                for (const record of recentVersions) {
                  console.log(`Processing version: date=${record.date}, type=${record.brief?.type || 'Unknown'}`)
                  
                  try {
                    // First check if version exists
                    const existingVersion = await db.tenderVersion.findFirst({
                      where: {
                        tenderId,
                        date: BigInt(record.date),
                        type: record.brief?.type || 'unknown',
                      }
                    })
                    
                    if (!existingVersion) {
                      // Create new version
                      await db.tenderVersion.create({
                        data: {
                          tenderId,
                          date: BigInt(record.date),
                          type: record.brief?.type || 'unknown',
                          data: record
                        }
                      })
                      console.log(`Created version: ${tenderId}, date: ${record.date}, type: ${record.brief?.type || 'unknown'}`)
                    } else {
                      console.log(`Version already exists: ${tenderId}, date: ${record.date}, type: ${record.brief?.type || 'unknown'}`)
                    }
                  } catch (error) {
                    console.error(`Error saving version for ${tenderId}, date ${record.date}:`, error)
                  }
                }
                
                // Create or update user view
                await db.tenderView.upsert({
                  where: {
                    userId_tenderId: { userId, tenderId }
                  },
                  update: {},
                  create: {
                    userId,
                    tenderId,
                    isArchived: false
                  }
                })
                
                // Get the complete tender data with all relations
                const savedTender = await db.tender.findUnique({
                  where: { id: tenderId },
                  include: {
                    versions: {
                      orderBy: { date: 'desc' }
                    }
                  }
                });

                if (savedTender) {
                  console.log(`✅ Preparing to stream tender: ${tenderId}`);
                  
                  // Get the latest version data
                  const latestVersion = savedTender.versions[0];
                  
                  // Prepare the tender data with proper structure
                  const tenderData = serializeTenderData({
                    tender: {
                      ...savedTender,
                      id: tenderId,
                      unit_id: tender.unit_id,
                      job_number: tender.job_number,
                      date: latestVersion?.date || Date.now(),
                      title: latestVersion?.data?.brief?.title || 'No title',
                      isArchived: false,
                      isHighlighted: false,
                      brief: latestVersion?.data?.brief || {}
                    },
                    versions: savedTender.versions.map(v => ({
                      ...v,
                      date: v.date.toString(),
                      data: {
                        ...v.data,
                        brief: v.data?.brief || {}
                      }
                    })),
                    relatedTenders: [],
                    isNew: !existingTenderIds.includes(tenderId)
                  });

                  processedCount++; // Increment counter
                  
                  // Stream the data
                  const message = `data: ${JSON.stringify(tenderData)}\n\n`;
                  // console.log(`📤 Streaming tender: ${tenderId}`, tenderData);
                  controller.enqueue(new TextEncoder().encode(message));
                } else {
                  console.log(`⚠️ No saved tender found for: ${tenderId}`);
                }
              } catch (error) {
                console.error(`❌ Error processing tender ${tenderId}:`, error);
              }
            }
          }
          
          console.log('\n✨ Finished processing all keywords');
          // Send completion message with total found and processed counts
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "complete",
                totalFound,
                processedCount
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error('❌ Stream processing error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Route error:', error);
    return NextResponse.json({ error: 'Failed to search tenders' }, { status: 500 });
  }
} 