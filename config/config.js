const required = ['MONGO_URI', 'AUTH_SECRET'];

function readEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function validateMongoUri(uri) {
  if (!uri) return;

  if (uri.includes('<') || uri.includes('>')) {
    throw new Error('MONGO_URI contains placeholder brackets. Replace <db_password> with your real password value.');
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

  const mongoUri = readEnv('MONGO_URI');
  const mongoUriFallback = readEnv('MONGO_URI_FALLBACK', '');
  validateMongoUri(mongoUri);
  if (mongoUriFallback) validateMongoUri(mongoUriFallback);

  return {
    env: nodeEnv,
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
