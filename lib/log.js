import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * writeLog: Persistent logging into SystemLog table (Postgres).
 * Replaces the legacy unshift/slice logic from store.js.
 */
export async function writeLog(entry) {
  try {
    await prisma.systemLog.create({
      data: {
        level: entry.level || 'info',
        message: entry.message || '',
        user_id: entry.user_id ? String(entry.user_id) : null,
        metadata: entry.metadata || {}
      }
    });
  } catch (error) {
    console.error('Logging Error:', error);
    // non-blocking
  }
}

/**
 * listLogs: Fetches logs with filtering.
 */
export async function listLogs(limit = 50, userId = '', isAdmin = false) {
  try {
    const logs = await prisma.systemLog.findMany({
      where: isAdmin ? {} : { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit
    });
    return logs;
  } catch (error) {
    console.error('List Logs Error:', error);
    return [];
  }
}
