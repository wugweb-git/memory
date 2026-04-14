const required = ['AUTH_SECRET'];
const mongoEnvKeys = ['MONGO_URI', 'MONGODB_URI', 'STORAGE_URL'];

function readEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function resolveMongoUri(rawUri, dbPassword) {
  if (!rawUri) return rawUri;
  if (rawUri.includes('<db_password>')) {
    if (!dbPassword) {
      throw new Error('MONGO_URI includes <db_password> but DB_PASSWORD is missing.');
    }
    return rawUri.replace('<db_password>', encodeURIComponent(dbPassword));
  }
  return rawUri;
}

function validateMongoUri(uri) {
  if (!uri) return;

  if (uri.includes('<') || uri.includes('>')) {
    throw new Error('MONGO_URI contains placeholder brackets. Replace <db_password> or provide DB_PASSWORD.');
  }

  const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^@]+)@/i);
  if (!match) return;

  const password = match[1].split(':').slice(1).join(':');
  if (password.includes('@') && !password.includes('%40')) {
    throw new Error('MONGO_URI password contains "@" and must be URL-encoded as "%40".');
  }
}

export function loadConfig() {
  const nodeEnv = readEnv('NODE_ENV', 'development');
  const missing = required.filter((k) => !readEnv(k));
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const mongoEnvKey = mongoEnvKeys.find((key) => readEnv(key));
  if (!mongoEnvKey) {
    throw new Error(`Missing MongoDB env var. Set one of: ${mongoEnvKeys.join(', ')}`);
  }

  const dbPassword = readEnv('DB_PASSWORD', '');
  const mongoUri = resolveMongoUri(readEnv(mongoEnvKey), dbPassword);
  const mongoUriFallback = resolveMongoUri(readEnv('MONGO_URI_FALLBACK', ''), dbPassword);

  validateMongoUri(mongoUri);
  if (mongoUriFallback) validateMongoUri(mongoUriFallback);

  return {
    env: nodeEnv,
    mongoEnvKey,
    mongoUri,
    mongoUriFallback,
    authSecret: readEnv('AUTH_SECRET'),
    allowedOrigins: readEnv('ALLOWED_ORIGINS', '*').split(',').map((x) => x.trim()),
    requestLimitBytes: Number(readEnv('REQUEST_LIMIT_BYTES', '1048576')),
    uploadDir: readEnv('UPLOAD_DIR', '/tmp/memory-uploads'),
    jobSecret: readEnv('JOB_SECRET', ''),
    appVersion: readEnv('APP_VERSION', readEnv('VERCEL_GIT_COMMIT_SHA', 'dev')),
    adminEmail: readEnv('ADMIN_EMAIL', 'admin@wugweb.com'),
    adminPassword: readEnv('ADMIN_PASSWORD', 'WugWeb123')
  };
}

export const config = loadConfig();
