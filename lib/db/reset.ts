import { db } from '@/lib/db'

//@ Function to reset the database
async function resetDatabase() {
  console.log('Starting database reset...')

  try {
    //@ Delete all records in reverse order of dependencies
    console.log('Deleting TenderViews...')
    await db.tenderView.deleteMany({})

    console.log('Deleting TenderVersions...')
    await db.tenderVersion.deleteMany({})

    console.log('Deleting Tenders...')
    await db.tender.deleteMany({})

    console.log('Deleting Keywords...')
    await db.keyword.deleteMany({})

    console.log('Deleting Users...')
    await db.user.deleteMany({})

    console.log('Database reset complete!')
  } catch (error) {
    console.error('Error resetting database:', error)
    throw error
  }
}

//@ Function to create a new tender with versions
async function createTenderWithVersions(
  tenderId: string, 
  records: any[]
) {
  console.log(`Creating tender ${tenderId} with ${records.length} versions...`)

  try {
    //@ Create the tender first
    const tender = await db.tender.create({
      data: { id: tenderId }
    })

    //@ Create versions for each record
    const versions = await Promise.all(
      records.map((record, index) => 
        db.tenderVersion.create({
          data: {
            tenderId,
            version: index + 1,
            data: record
          }
        })
      )
    )

    console.log(`Created tender with ${versions.length} versions:`, {
      tenderId,
      versions: versions.map(v => v.version)
    })

    return { tender, versions }
  } catch (error) {
    console.error(`Error creating tender ${tenderId}:`, error)
    throw error
  }
}

export { resetDatabase, createTenderWithVersions } 