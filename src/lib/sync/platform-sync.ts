export async function syncPublishedState(params: { platform: string; externalId: string; status: string }) {
  return { synced: true, ...params, syncedAt: new Date().toISOString() };
}
