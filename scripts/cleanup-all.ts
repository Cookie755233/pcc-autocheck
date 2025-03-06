import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function cleanupTenders() {
  try {
    console.log('Cleaning up ALL tables...')
    
    // Delete in correct order due to foreign key constraints
    await db.tenderView.deleteMany({})
    console.log('✓ Cleared tender views')
    
    await db.tenderVersion.deleteMany({})
    console.log('✓ Cleared tender versions')
    
    await db.tender.deleteMany({})
    console.log('✓ Cleared tenders')

    await db.keyword.deleteMany({})
    console.log('✓ Cleared keywords')

    await db.user.deleteMany({})
    console.log('✓ Cleared users')
    
    await db.paypalPlan.deleteMany({})
    console.log('✓ Cleared paypal plans')

    console.log('Cleanup completed successfully!')
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await db.$disconnect()
  }
}

cleanupTenders() 