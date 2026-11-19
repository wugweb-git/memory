type FeedbackDb = {
  feedbackLog: {
    findFirst: (args: any) => Promise<{ id: string } | null>;
    create: (args: any) => Promise<{ id: string }>;
  };
};

export type RecordFeedbackResult = { id: string; duplicate: boolean };

/**
 * Insert-first idempotent write. The unique index on
 * (decisionId, userId, feedbackType) is the source of truth: a Prisma P2002
 * means a concurrent/earlier request already stored it, so return that row.
 */
export async function recordFeedback(
  db: FeedbackDb,
  data: { decisionId: string; userId: string; feedbackType: string; comment?: string | null },
): Promise<RecordFeedbackResult> {
  const { decisionId, userId, feedbackType } = data;
  const find = () => db.feedbackLog.findFirst({ where: { decisionId, userId, feedbackType }, select: { id: true } });
  const existing = await find();
  if (existing) return { id: existing.id, duplicate: true };
  try {
    const created = await db.feedbackLog.create({ data });
    return { id: created.id, duplicate: false };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const row = await find();
      if (row) return { id: row.id, duplicate: true };
    }
    throw err;
  }
}
