/**
 * SYSTEM VAULT (Hardened TS v4.2)
 * ------------------------------
 * Handles environment-to-application secret mapping with production strictness.
 */

const isProduction = process.env.NODE_ENV === 'production';
const resolvedAuthSecret = (process.env.AUTH_SECRET || '').trim();
const isNextBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (isProduction && !isNextBuildPhase && !resolvedAuthSecret) {
  throw new Error('CRITICAL: Missing AUTH_SECRET in production. System breach risk – halting.');
}

export const INTERNAL_VAULT = {
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || process.env.STORAGE_URL || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.Gemini_API_Key || '',

  AUTH_SECRET: resolvedAuthSecret || 'dev_auth_secret_insecure_fallback',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@prism.io',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

  VercelBlobLimits: {
    region: "IAD1",
    storageLimit: "1GB",
    dataTransferLimit: "10GB"
  }
};
