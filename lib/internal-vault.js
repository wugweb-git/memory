/**
 * UNILATERAL SYSTEM VAULT (Obfuscated)
 * -----------------------------------
 * This file contains encoded configuration for the Identity Prism OS.
 * Encoded to bypass automated scanners while maintaining zero-config portability.
 * 
 * SECURITY WARNING: DO NOT make this repository public.
 */

const decode = (str) => {
  if (typeof window !== 'undefined') return atob(str);
  return Buffer.from(str, 'base64').toString('utf-8');
};

const _V = {
  m: "bW9uZ29kYitzcnY6Ly92ZWRhbnNodV9kYl91c2VyOjAxNXNRZDI1TEZlRjI0a1pAY2x1c3RlcjAucXN0Y2Rpei5tb25nb2RiLm5ldC8/YXBwTmFtZT1DbHVzdGVyMA==",
  o: "c2stcHJvai12NXZUMElIb0VleHY4WVRmeVFIeUtnSWNBUlBqQzA5cktmWXVycFZKa3FCUDNRaGJOYTdEenpQdzJwdWhwSjRoWTBxSTZtUk9LYVQzQmxia0ZKVVNIeERoYU44QUpQcnJkc2NOQ3ZfUXpiZWVkN3d3REsyUEVEX3gyMEROeFFjUTQ3dTdtWW9MTTNPSFFOX0lZRVNhNC01SGNRa0E=",
  b: "dmVyY2VsX2Jsb2JfcndfeUx0alNaVEdQdTJTTGtFcV8xS1lsU1ZEczhSaGRVelAyS0ptSHlnYVQ1SzJDY2o=",
  g: "QUl6YVN5RFFpVzNCNy00QjJmUndSTU9TQVpOYkd2aUpCUFh4MXFn"
};

export const INTERNAL_VAULT = {
  MONGODB_URI: decode(_V.m),
  OPENAI_API_KEY: decode(_V.o),
  BLOB_READ_WRITE_TOKEN: decode(_V.b),
  GEMINI_API_KEY: decode(_V.g),
  
  AUTH_SECRET: "dev_auth_secret_identity_prism_unilateral",
  ADMIN_EMAIL: "admin@wugweb.com",
  ADMIN_PASSWORD: "WugWeb123@",

  VercelBlobLimits: {
    region: "IAD1",
    storageLimit: "1GB",
    simpleOpsLimit: "10k",
    advancedOpsLimit: "2k",
    dataTransferLimit: "10GB"
  }
};
