import { PrismaClient } from "../../generated/postgres"

const globalForPrisma = globalThis as unknown as { prismaPostgres?: PrismaClient }

export const postgres = globalForPrisma.prismaPostgres || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaPostgres = postgres
