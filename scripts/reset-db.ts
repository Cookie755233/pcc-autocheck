import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

//@ Initialize PrismaClient with accelerate
const db = new PrismaClient().$extends(withAccelerate())

//@ Function to reset the database
async function resetDatabase() {
  console.log('Starting database reset...')

  try {
    // Try to delete tables if they exist
    for (const table of ['tender_views', 'tender_versions', 'tenders', 'keywords', 'users']) {
      try {
        console.log(`Attempting to delete ${table}...`)
        await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE;`)
        console.log(`Deleted ${table}`)
      } catch (error) {
        console.log(`Table ${table} might not exist, continuing...`)
      }
    }

    // Push new schema
    console.log('Pushing new schema...')
    await db.$executeRaw`CREATE SCHEMA IF NOT EXISTS public;`
    
    console.log('Database reset complete!')
  } catch (error) {
    console.error('Error resetting database:', error)
    throw error
  }
}

//@ Function to create test data
async function createTestData() {
  console.log('Creating test data...')

  try {
    //@ Test creating a tender with versions
    const testTenderId = 'unit_id=TEST.1.1&job_number=TEST2024-001'
    const testRecords = [
      {
        unit_id: 'TEST.1.1',
        job_number: 'TEST2024-001',
        brief: {
          type: 'test',
          title: 'Test Tender V1',
          category: 'test'
        },
        date: Date.now(),
        keyword: 'test',
        records: [{ id: 1 }] // Adding a record for recordCount
      },
      {
        unit_id: 'TEST.1.1',
        job_number: 'TEST2024-001',
        brief: {
          type: 'test',
          title: 'Test Tender V2',
          category: 'test'
        },
        date: Date.now(),
        keyword: 'test',
        records: [{ id: 1 }, { id: 2 }] // Adding records for recordCount
      }
    ]

    //@ Create the tender first
    const tender = await db.tender.create({
      data: { id: testTenderId }
    })

    //@ Create versions for each record
    const versions = await Promise.all(
      testRecords.map((record, index) => 
        db.tenderVersion.create({
          data: {
            tenderId: testTenderId,
            version: index + 1,
            data: record,
            recordCount: record.records?.length || 0 // Add recordCount field
          }
        })
      )
    )

    console.log(`Created tender with ${versions.length} versions:`, {
      tenderId: testTenderId,
      versions: versions.map(v => v.version)
    })
  } catch (error) {
    console.error('Error creating test data:', error)
    throw error
  }
}

async function main() {
  try {
    await resetDatabase()
    // await createTestData()
    await db.$disconnect()
  } catch (error) {
    console.error('Reset script failed:', error)
    await db.$disconnect()
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  }) 