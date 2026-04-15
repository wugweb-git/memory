/**
 * SYSTEM VAULT
 * ------------
 * Never commit production secrets here.
 * Use environment variables in Vercel/Netlify instead.
 */

const isProduction = process.env.NODE_ENV === 'production';
const resolvedAuthSecret = (process.env.AUTH_SECRET || '').trim();

if (isProduction && !resolvedAuthSecret) {
  throw new Error('Missing required AUTH_SECRET in production environment. Refusing to start with an empty auth secret.');
}

export const INTERNAL_VAULT = {
  // Optional local-only fallbacks; production should rely on platform env vars.
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || process.env.STORAGE_URL || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  AUTH_SECRET: resolvedAuthSecret || 'dev_auth_secret_change_me',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

  VercelBlobLimits: {
    region: "IAD1",
    storageLimit: "1GB",
    simpleOpsLimit: "10k",
    advancedOpsLimit: "2k",
    dataTransferLimit: "10GB"
  }
};
