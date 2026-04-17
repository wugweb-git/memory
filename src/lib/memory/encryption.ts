import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.MEMORY_ENCRYPTION_KEY;

export function encrypt(text: string): { content: string; iv: string; tag: string } {
  if (!KEY) {
    throw new Error('ENCRYPTION_KEY_MISSING: Cannot process sensitive data without a valid key.');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    content: encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
}

export function decrypt(encrypted: { content: string; iv: string; tag: string }): string {
  if (!KEY) {
    throw new Error('ENCRYPTION_KEY_MISSING: Decryption blocked.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(KEY, 'hex'),
    Buffer.from(encrypted.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
  
  let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function isEncryptionConfigured(): boolean {
  return typeof KEY === 'string' && KEY.length === 64; // 32 bytes in hex = 64 chars
}
