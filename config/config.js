import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const required = [];

function readEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function readEnvAny(names, fallback = '') {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return fallback;
}

export function loadConfig() {
  const missing = required.filter((k) => !readEnv(k));
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const env = readEnv('NODE_ENV', 'development');
<<<<<<< HEAD
<<<<<<< HEAD
  const authSecret = readEnv('AUTH_SECRET', INTERNAL_VAULT.AUTH_SECRET).trim();

  if (env === 'production' && !authSecret) {
    throw new Error('Missing required AUTH_SECRET in production environment.');
=======
  const authSecret = readEnv('AUTH_SECRET', INTERNAL_VAULT.AUTH_SECRET);
=======
  const rawAuthSecret = process.env.AUTH_SECRET;
>>>>>>> 2e2f27e (Fix production AUTH_SECRET guard to validate raw env)

  if (env === 'production' && !String(rawAuthSecret ?? '').trim()) {
    throw new Error('Missing required env var in production: AUTH_SECRET');
>>>>>>> f23c7cf (Fail closed on missing AUTH_SECRET in production)
  }

  const authSecret = readEnv('AUTH_SECRET', INTERNAL_VAULT.AUTH_SECRET);

  return {
    env,
    authSecret,
    mongodbUri: readEnvAny(['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'], INTERNAL_VAULT.MONGODB_URI),
    openaiApiKey: readEnv('OPENAI_API_KEY', INTERNAL_VAULT.OPENAI_API_KEY),
    geminiApiKey: readEnvAny(['GEMINI_API_KEY', 'Gemini_API_Key'], INTERNAL_VAULT.GEMINI_API_KEY),
    blobToken: readEnv('BLOB_READ_WRITE_TOKEN', INTERNAL_VAULT.BLOB_READ_WRITE_TOKEN),
    allowedOrigins: readEnv('ALLOWED_ORIGINS', '*').split(',').map((x) => x.trim()),
    requestLimitBytes: Number(readEnv('REQUEST_LIMIT_BYTES', '1048576')),
    uploadDir: readEnv('UPLOAD_DIR', '/tmp/memory-uploads'),
    jobSecret: readEnv('JOB_SECRET', ''),
    appVersion: readEnv('APP_VERSION', readEnv('VERCEL_GIT_COMMIT_SHA', 'dev')),
    adminEmail: readEnv('ADMIN_EMAIL', INTERNAL_VAULT.ADMIN_EMAIL),
    adminPassword: readEnv('ADMIN_PASSWORD', INTERNAL_VAULT.ADMIN_PASSWORD),
    blobDataPath: readEnv('BLOB_DATA_PATH', 'memory/store.json'),
    vaultStatus: 'ACTIVE'
  };
}

export const config = loadConfig();
