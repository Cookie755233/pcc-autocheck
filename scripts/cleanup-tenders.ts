import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function cleanupTenders() {
  try {
    console.log('Cleaning up tender-related tables...')
    
    // Delete in correct order due to foreign key constraints
    await db.tenderView.deleteMany({})
    console.log('✓ Cleared tender views')
    
    await db.tenderVersion.deleteMany({})
    console.log('✓ Cleared tender versions')
    
    await db.tender.deleteMany({})
    console.log('✓ Cleared tenders')
    
    console.log('Cleanup completed successfully!')
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await db.$disconnect()
  }
}

cleanupTenders() 