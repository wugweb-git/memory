const required = ['MONGO_URI', 'AUTH_SECRET'];

function readEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

export function loadConfig() {
  const nodeEnv = readEnv('NODE_ENV', 'development');
  const missing = required.filter((k) => !readEnv(k));
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  return {
    env: nodeEnv,
    mongoUri: readEnv('MONGO_URI'),
    authSecret: readEnv('AUTH_SECRET'),
    allowedOrigins: readEnv('ALLOWED_ORIGINS', '*').split(',').map((x) => x.trim()),
    requestLimitBytes: Number(readEnv('REQUEST_LIMIT_BYTES', '1048576')),
    uploadDir: readEnv('UPLOAD_DIR', '/tmp/memory-uploads'),
    jobSecret: readEnv('JOB_SECRET', ''),
    appVersion: readEnv('APP_VERSION', readEnv('VERCEL_GIT_COMMIT_SHA', 'dev')),
    adminEmail: readEnv('ADMIN_EMAIL', 'admin@wugweb.com'),
    adminPassword: readEnv('ADMIN_PASSWORD', 'WugWeb123@')
  };
}

export const config = loadConfig();
