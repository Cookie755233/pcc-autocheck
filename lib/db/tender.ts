import { db } from "@/lib/db"
import { Tender as APITender } from "@/types/tender"

//@ Helper to generate unique tender ID from API response
function generateTenderId(tender: APITender): string {
  return `unit_id=${tender.unit_id}&job_number=${tender.job_number}`
}

//@ Create or update tender and its version
async function upsertTender(tender: APITender, userId: string) {
  const tenderId = generateTenderId(tender)
  
  //? First, upsert the main tender record
  const tenderRecord = await db.tender.upsert({
    where: { id: tenderId },
    create: { id: tenderId },
    update: {},
  })

  //? Get the latest version to check if we need a new one
  const latestVersion = await db.tenderVersion.findFirst({
    where: { tenderId },
    orderBy: { version: 'desc' },
  })

  //? Check if we need to create a new version
  const recordCount = tender.records?.length || 0
  if (!latestVersion || latestVersion.recordCount !== recordCount) {
    //? Create new version if records array changed
    await db.tenderVersion.create({
      data: {
        tenderId,
        data: tender as any, //? Store complete tender data
        recordCount,
        version: (latestVersion?.version || 0) + 1,
      },
    })

    //? Create or update user's view of this tender
    await db.tenderView.upsert({
      where: {
        userId_tenderId: {
          userId,
          tenderId,
        },
      },
      create: {
        userId,
        tenderId,
        isArchived: false, //? New versions always unarchive
      },
      update: {
        isArchived: false, //? New versions always unarchive
      },
    })
  }

  return tenderRecord
}

//@ Get user's tenders with their latest versions
async function getUserTenders(userId: string) {
  return db.tenderView.findMany({
    where: { userId },
    include: {
      tender: {
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  })
}

//@ Save a new keyword for a user
async function saveKeyword(userId: string, keyword: string) {
  return db.keyword.create({
    data: {
      userId,
      text: keyword.toLowerCase().trim(),
    },
  })
}

//@ Get user's keywords
async function getUserKeywords(userId: string) {
  return db.keyword.findMany({
    where: { userId },
  })
}

//@ Toggle tender archive status
async function toggleTenderArchive(userId: string, tenderId: string, isArchived: boolean) {
  return db.tenderView.update({
    where: {
      userId_tenderId: {
        userId,
        tenderId,
      },
    },
    data: { isArchived },
  })
}

export {
  upsertTender,
  getUserTenders,
  saveKeyword,
  getUserKeywords,
  toggleTenderArchive,
} 