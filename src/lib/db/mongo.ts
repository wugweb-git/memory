import { PrismaClient } from "../../generated/mongo"

const globalForPrisma = globalThis as unknown as { prismaMongo?: PrismaClient }

export const mongo = globalForPrisma.prismaMongo || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaMongo = mongo
