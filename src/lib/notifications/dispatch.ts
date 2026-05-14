export async function sendExecutionNotification(message: string, channel: "email" | "in-app" = "in-app") {
  return { delivered: true, channel, message };
}
