import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let ready = false;

export async function connectDB() {
  if (!ready) {
    await prisma.$connect();
    ready = true;
  }

  return {
    provider: process.env.DATABASE_URL ? 'postgresql' : 'memory',
    connected: true
  };
}

export { prisma };
