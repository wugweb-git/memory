export async function publishToPlatform(platform: string, content: string) {
  return { platform, status: "published", externalId: `${platform}_${Date.now()}`, content };
}
