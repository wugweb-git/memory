/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 */

import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const REQUIRED_VARS = [
  'AUTH_SECRET'
];

const MONGO_ALIASES = ['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'];

function resolveMongoUri() {
  return MONGO_ALIASES.map((key) => process.env[key]).find(Boolean) || INTERNAL_VAULT.MONGODB_URI;
}

function validate() {
  console.log('--- SYSTEM_GUARDRAIL: ENVIRONMENT_AUDIT ---');
  const missing = [];

  // Check required vars (Env or Vault)
  REQUIRED_VARS.forEach((key) => {
    if (!process.env[key] && !INTERNAL_VAULT[key]) {
      missing.push(key);
    }
  });

  const mongoUri = resolveMongoUri();
  if (!mongoUri) {
    missing.push('MONGODB_URI (or MONGO_URI/STORAGE_URL alias)');
  }

  if (missing.length > 0) {
    console.error('ERROR: Missing required configuration in both Environment and System Vault:');
    missing.forEach((key) => console.error(` - ${key}`));
    if (missing.includes('AUTH_SECRET')) {
      console.error('TIP: Add AUTH_SECRET to your Vercel/Netlify project environment variables.');
    }
    if (missing.some((key) => key.startsWith('MONGODB_URI'))) {
      console.error('TIP: Add MONGODB_URI (or MONGO_URI/STORAGE_URL) so /api/chat RAG can initialize Mongo retrievers.');
    }
    console.error('System initialization aborted.');
    process.exit(1);
  }

  const isVaulted = !REQUIRED_VARS.every((key) => process.env[key]) || !MONGO_ALIASES.some((key) => process.env[key]);
  if (isVaulted) {
    console.log('STATUS: Operating in UNILATERAL_VAULT mode (Zero-Config Enabled).');
  }

  if (!mongoUri.startsWith('mongodb')) {
    console.error('ERROR: Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://".');
    process.exit(1);
  }

  console.log('SUCCESS: All mandatory environment variables are present.');
  console.log('--- AUDIT_COMPLETE: NOMINAL_STATE ---');
  process.exit(0);
}

validate();
