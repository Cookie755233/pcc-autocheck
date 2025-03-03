import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

/**
 * Cleanup script to remove tenders and related records that are no longer associated
 * with any active keywords. This helps keep the database clean and efficient.
 *
 * Specifically, this script:
 * 1. Gets all active keywords from all users
 * 2. Finds tenders whose tags don't match any existing keywords
 * 3. Logs which tenders will be deleted along with their versions and views
 * 4. Performs the deletions with proper cascading (views, versions, and then tenders)
 */

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Starting orphaned tender cleanup process...');
  
  try {
    // Step 1: Get all active keywords from the database
    const allKeywords = await prisma.keyword.findMany({
      where: { isActive: true },
      select: { text: true }
    });
    
    const activeKeywordSet = new Set(allKeywords.map(k => k.text.toLowerCase()));
    console.log(`📊 Found ${activeKeywordSet.size} active keywords in the database`);
    
    // Step 2: Get all tenders
    const allTenders = await prisma.tender.findMany({
      select: {
        id: true,
        tags: true,
        _count: {
          select: {
            versions: true,
            views: true
          }
        }
      }
    });
    console.log(`📊 Found ${allTenders.length} total tenders in the database`);
    
    // Step 3: Find tenders whose tags don't match any active keywords
    const orphanedTenders = allTenders.filter(tender => {
      // Normalize tags to lowercase for case-insensitive comparison
      const normalizedTags = tender.tags.map(tag => tag.toLowerCase());
      
      // A tender is orphaned if NONE of its tags match any active keywords
      return !normalizedTags.some(tag => activeKeywordSet.has(tag));
    });
    
    console.log(`🔍 Found ${orphanedTenders.length} orphaned tenders with no matching active keywords`);
    
    // Save details to log file for audit purposes
    const logData = {
      timestamp: new Date().toISOString(),
      totalKeywords: activeKeywordSet.size,
      totalTenders: allTenders.length,
      orphanedTenders: orphanedTenders.map(t => ({
        id: t.id,
        tags: t.tags,
        versionCount: t._count.versions,
        viewCount: t._count.views
      }))
    };
    
    fs.writeFileSync(
      `tender-cleanup-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(logData, null, 2)
    );
    
    // Ask for confirmation before proceeding
    const orphanedCount = orphanedTenders.length;
    if (orphanedCount === 0) {
      console.log('✅ No orphaned tenders found. Database is clean!');
      return;
    }
    
    console.log(`⚠️  Will delete ${orphanedCount} tenders and their associated versions and views.`);
    console.log('⚠️  This operation cannot be undone.');
    console.log('⚠️  Please check the log file for details before confirming.');
    
    // In an interactive environment, you would prompt for confirmation here
    // For this script, we'll add a variable to control execution
    const EXECUTE_DELETION = true; // Set to true to perform the actual deletion
    
    if (!EXECUTE_DELETION) {
      console.log('❌ Deletion skipped. Set EXECUTE_DELETION to true to perform the cleanup.');
      return;
    }
    
    // Step 4: Delete the orphaned tenders 
    // Note: With proper foreign key constraints (onDelete: Cascade),
    // deleting tenders will automatically delete associated versions and views
    
    console.log('🗑️  Deleting orphaned tenders and related records...');
    
    const deletedTenderIds = orphanedTenders.map(t => t.id);
    
    // Delete in the correct order to respect foreign key constraints
    // if you don't have cascade delete set up
    const deletedViews = await prisma.tenderView.deleteMany({
      where: {
        tenderId: {
          in: deletedTenderIds
        }
      }
    });
    
    const deletedVersions = await prisma.tenderVersion.deleteMany({
      where: {
        tenderId: {
          in: deletedTenderIds
        }
      }
    });
    
    const deletedTenders = await prisma.tender.deleteMany({
      where: {
        id: {
          in: deletedTenderIds
        }
      }
    });
    
    console.log(`✅ Cleanup complete!`);
    console.log(`🗑️  Deleted ${deletedViews.count} tender views`);
    console.log(`🗑️  Deleted ${deletedVersions.count} tender versions`);
    console.log(`🗑️  Deleted ${deletedTenders.count} orphaned tenders`);
    
  } catch (error) {
    console.error('❌ Error during cleanup process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the cleanup function
cleanup()
  .then(() => console.log('📝 Cleanup script completed'))
  .catch(e => console.error('❌ Script execution failed:', e)); 