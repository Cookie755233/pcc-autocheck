import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugTender(tenderId: string) {
  try {
    //@ Get tender with all related data
    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' }
        },
        views: true
      }
    })

    if (!tender) {
      console.log('❌ Tender not found')
      return
    }

    //@ Log basic tender info
    console.log('\n📋 Tender Basic Info:')
    console.log('------------------------')
    console.log(`ID: ${tender.id}`)
    console.log(`Tags: ${tender.tags.join(', ')}`)
    console.log(`Created: ${tender.createdAt}`)
    console.log(`Updated: ${tender.updatedAt}`)

    //@ Log versions with detailed data structure
    console.log('\n📚 Versions:')
    console.log('------------------------')
    tender.versions.forEach((version, index) => {
      console.log(`\nVersion ${index + 1}:`)
      console.log('Version Metadata:')
      console.log('----------------')
      console.log(`ID: ${version.id}`)
      console.log(`Created: ${version.createdAt}`)
      console.log(`Date: ${version.date.toString()}`)
      
      const data = version.data as any
      console.log('\nVersion Data Structure:')
      console.log('---------------------')
      console.log('Basic Info:')
      console.log(`- URL: ${data.url}`)
      console.log(`- Unit ID: ${data.unit_id}`)
      console.log(`- Unit Name: ${data.unit_name}`)
      console.log(`- Job Number: ${data.job_number}`)
      
      console.log('\nBrief:')
      if (data.brief) {
        console.log(`- Title: ${data.brief.title}`)
        console.log(`- Type: ${data.brief.type}`)
        console.log(`- Category: ${data.brief.category}`)
      }

      console.log('\nDetail Fields:')
      if (data.detail) {
        // Group and log detail fields by category
        const categories = {
          '機關資料': Object.entries(data.detail).filter(([k]) => k.startsWith('機關資料:')),
          '採購資料': Object.entries(data.detail).filter(([k]) => k.startsWith('採購資料:')),
          '招標資料': Object.entries(data.detail).filter(([k]) => k.startsWith('招標資料:')),
          '領投開標': Object.entries(data.detail).filter(([k]) => k.startsWith('領投開標:')),
          '決標資料': Object.entries(data.detail).filter(([k]) => k.startsWith('決標資料:')),
          '無法決標': Object.entries(data.detail).filter(([k]) => k.startsWith('無法決標:')),
          '投標廠商': Object.entries(data.detail).filter(([k]) => k.startsWith('投標廠商:')),
          '決標品項': Object.entries(data.detail).filter(([k]) => k.startsWith('決標品項:'))
        }

        for (const [category, fields] of Object.entries(categories)) {
          if (fields.length > 0) {
            console.log(`\n${category}:`)
            fields.forEach(([key, value]) => {
              // Remove category prefix for cleaner output
              const fieldName = key.split(':').slice(1).join(':')
              console.log(`- ${fieldName}: ${value || '未提供'}`)
            })
          }
        }
      } else {
        console.log('No detail data available')
      }
      console.log('\n------------------------')
    })

    //@ Log views
    console.log('\n👁️ Views:')
    console.log('------------------------')
    tender.views.forEach((view, index) => {
      console.log(`\nView ${index + 1}:`)
      console.log(`User ID: ${view.userId}`)
      console.log(`Archived: ${view.isArchived}`)
      console.log(`Created: ${view.createdAt}`)
      console.log(`Updated: ${view.updatedAt}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get tender ID from command line argument
const tenderId = process.argv[2]
if (!tenderId) {
  console.log('❌ Please provide a tender ID')
  process.exit(1)
}

debugTender(tenderId) 