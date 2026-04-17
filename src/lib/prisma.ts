import { PrismaClient, Prisma } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

/**
 * Checks if a thrown error is a Prisma Unique Constraint violation (P2002).
 */
export function isUniqueError(error: any): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
