import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

//? Define proper types for global prisma instance with Accelerate
declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: ReturnType<typeof prismaClientWithExtensions>
}

//@ Create PrismaClient with extensions
const prismaClientWithExtensions = () => {
  return new PrismaClient().$extends(withAccelerate())
}

//@ Initialize prisma with proper typing
let prisma: ReturnType<typeof prismaClientWithExtensions>

//@ Handle production vs development environments
if (process.env.NODE_ENV === 'production') {
  prisma = prismaClientWithExtensions()
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = prismaClientWithExtensions()
  }
  prisma = global.cachedPrisma
}

export const db = prisma

//@ Test database connection
db.$connect()
  .then(() => {
    console.log('✅ Database connected successfully')
  })
  .catch((error: Error) => {
    console.error('❌ Failed to connect to database:', error)
  }) 