import { postgres } from "@/lib/db/postgres";

export async function getContentAnalytics(userId: string) {
  const published = await (postgres as any).publishedOutput.findMany({ where: { userId } });
  return {
    totalPublished: published.length,
    byPlatform: published.reduce((acc: any, p: any) => {
      const key = p.platform || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
}
