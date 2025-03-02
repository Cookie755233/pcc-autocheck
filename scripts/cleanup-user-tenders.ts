import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

/**
 * Cleans up tenders and related data for a specific user
 */
async function cleanupUserTenders(userId?: string) {
  try {
    // Get user ID from command line arguments if not provided directly
    if (!userId) {
      const args = process.argv.slice(2)
      console.log('Arguments received:', args) // Debug log
      
      // Handle various argument formats
      const userIdArg = args.find(arg => arg.startsWith('-u=') || arg.startsWith('--user='))
      
      if (userIdArg) {
        userId = userIdArg.split('=')[1]
      } else if (args.indexOf('-u') !== -1 || args.indexOf('--user') !== -1) {
        const index = args.indexOf('-u') !== -1 ? args.indexOf('-u') : args.indexOf('--user')
        if (index < args.length - 1) {
          userId = args[index + 1]
        }
      }
    }

    if (!userId) {
      console.error('❌ No user ID provided. Please specify a user ID with -u or --user.')
      console.log('Usage examples:')
      console.log('  npm run cleanup:user -- -u=user_123')
      console.log('  npm run cleanup:user -- --user=user_123')
      console.log('  npm run cleanup:user -- -u user_123')
      console.log('  npm run cleanup:user -- --user user_123')
      console.log('\nNote: The double dash (--) is important when using npm scripts!')
      process.exit(1)
    }

    console.log(`🧹 Cleaning up tender data for user: ${userId}`)
    
    // First, check if the user exists in the database
    const userExists = await db.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })
    
    if (!userExists) {
      console.warn(`⚠️ Warning: User ${userId} not found in database.`)
      console.log('Exiting without performing any cleanup.')
      return
    }
    
    // According to schema.prisma, TenderView connects User and Tender
    // Step 1: Find all the user's tender views
    const userTenderViews = await db.tenderView.findMany({
      where: { 
        userId: userId 
      },
      select: { 
        id: true,
        tenderId: true
      }
    })
    
    if (userTenderViews.length === 0) {
      console.log('No tender views found for this user. Nothing to clean up.')
      return
    }
    
    console.log(`Found ${userTenderViews.length} tender views for user ${userId}`)
    
    // Step 2: Extract tender IDs from the views
    const tenderIds = userTenderViews.map(view => view.tenderId)
    const tenderViewIds = userTenderViews.map(view => view.id)
    
    // Step 3: Delete the user's tender views
    const deletedViews = await db.tenderView.deleteMany({
      where: { 
        id: { in: tenderViewIds }
      }
    })
    console.log(`✓ Deleted ${deletedViews.count} tender views`)
    
    // Step 4: Check if any tenders need to be deleted (ones that no other user has views for)
    for (const tenderId of tenderIds) {
      // Check if this tender has any other views from other users
      const otherViewsCount = await db.tenderView.count({
        where: {
          tenderId: tenderId
        }
      })
      
      if (otherViewsCount === 0) {
        // No other users have this tender in their views, safe to delete
        console.log(`Tender ${tenderId} has no other views, deleting it and its versions...`)
        
        // Delete versions first due to foreign key constraints
        const deletedVersions = await db.tenderVersion.deleteMany({
          where: {
            tenderId: tenderId
          }
        })
        console.log(`  ✓ Deleted ${deletedVersions.count} versions for tender ${tenderId}`)
        
        // Then delete the tender itself
        const deletedTender = await db.tender.delete({
          where: {
            id: tenderId
          }
        })
        console.log(`  ✓ Deleted tender ${tenderId}`)
      } else {
        console.log(`Tender ${tenderId} has ${otherViewsCount} other views, keeping it`)
      }
    }
    
    // Step 5: Also clean up any keywords for this user
    try {
      const deletedKeywords = await db.keyword.deleteMany({
        where: {
          userId: userId
        }
      })
      console.log(`✓ Deleted ${deletedKeywords.count} keywords for user ${userId}`)
    } catch (error) {
      console.error('Error deleting keywords:', error)
    }
    
    console.log('✅ Cleanup for user completed successfully!')
  } catch (error) {
    console.error('❌ Error during user cleanup:', error)
  } finally {
    await db.$disconnect()
  }
}

// Allow running directly (node scripts/cleanup-user-tenders.ts -u=userId)
if (require.main === module) {
  cleanupUserTenders()
}

// Also export the function for programmatic use
export { cleanupUserTenders } 