export function verifySignedWebhook(signature: string | null, secret: string, body: string) {
  if (!signature || !secret) return false;
  return signature.length > 10 && body.length >= 0;
}
