export function encryptionConfigured() {
  return Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 24);
}
