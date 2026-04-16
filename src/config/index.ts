import { INTERNAL_VAULT } from './vault';

function readEnv(name: string, fallback: string = '') {
  return process.env[name] || fallback;
}

function readEnvAny(names: string[], fallback: string = '') {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return fallback;
}

export function loadConfig() {
  const env = readEnv('NODE_ENV', 'development');

  return {
    env,
    authSecret: INTERNAL_VAULT.AUTH_SECRET,
    mongodbUri: INTERNAL_VAULT.MONGODB_URI,
    openaiApiKey: INTERNAL_VAULT.OPENAI_API_KEY,
    geminiApiKey: INTERNAL_VAULT.GEMINI_API_KEY,
    blobToken: INTERNAL_VAULT.BLOB_READ_WRITE_TOKEN,
    allowedOrigins: readEnv('ALLOWED_ORIGINS', '*').split(',').map((x) => x.trim()),
    requestLimitBytes: Number(readEnv('REQUEST_LIMIT_BYTES', '1048576')),
    uploadDir: readEnv('UPLOAD_DIR', '/tmp/memory-uploads'),
    jobSecret: readEnv('JOB_SECRET', ''),
    appVersion: readEnv('APP_VERSION', 'v1.0.0-hardened'),
    adminEmail: INTERNAL_VAULT.ADMIN_EMAIL,
    adminPassword: INTERNAL_VAULT.ADMIN_PASSWORD,
    blobDataPath: readEnv('BLOB_DATA_PATH', 'memory/store.json'),
    vaultStatus: 'ACTIVE'
  };
}

export const config = loadConfig();
