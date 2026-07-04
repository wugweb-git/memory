import { postgres } from './db/postgres';
import type { Prisma } from '../generated/postgres';

// Re-export the singleton so legacy imports still work
export default postgres;
export { Prisma };

/**
 * Checks if a thrown error is a Prisma Unique Constraint violation (P2002).
 */
export function isUniqueError(error: any): boolean {
  return Boolean(error && typeof error === 'object' && (error as any).code === 'P2002');
}
