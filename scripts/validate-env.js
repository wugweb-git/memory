/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 */

import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const REQUIRED_VARS = [
  'AUTH_SECRET'
];

const MONGO_ALIASES = ['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'];

function hasConfiguredVar(key) {
  return Boolean(process.env[key] || INTERNAL_VAULT[key]);
}

function resolveMongoUri() {
  for (const key of MONGO_ALIASES) {
    if (process.env[key]) return process.env[key];
    if (INTERNAL_VAULT[key]) return INTERNAL_VAULT[key];
  }
  return null;
}

function validate() {
  console.log('--- SYSTEM_GUARDRAIL: ENVIRONMENT_AUDIT ---');
  const missing = [];

  // Check required vars (Env or Vault)
  REQUIRED_VARS.forEach(v => {
    if (!hasConfiguredVar(v)) {
      missing.push(v);
    }
  });

  const uri = resolveMongoUri();
  if (!uri) {
    missing.push('MONGODB_URI (or alias: MONGO_URI / STORAGE_URL)');
  }

  if (missing.length > 0) {
    console.error('ERROR: Missing required configuration in both Environment and System Vault:');
    missing.forEach(m => console.error(` - ${m}`));
    if (missing.some(m => m.includes('MONGODB_URI'))) {
      console.error('TIP: Add MONGODB_URI (or MONGO_URI/STORAGE_URL) to your deployment environment variables.');
    }
    if (missing.includes('AUTH_SECRET')) {
      console.error('TIP: Add AUTH_SECRET to your Vercel/Netlify project environment variables.');
    }
    console.error('System initialization aborted.');
    process.exit(1);
  }

  const isVaulted = !REQUIRED_VARS.every(v => process.env[v]) || !MONGO_ALIASES.some(v => process.env[v]);
  if (isVaulted) {
    console.log('STATUS: Operating in UNILATERAL_VAULT mode (Zero-Config Enabled).');
  }

  console.log('SUCCESS: All mandatory environment variables are present.');

  // Format validation for URI
  if (!uri.startsWith('mongodb')) {
    console.error('ERROR: Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://".');
    process.exit(1);
  }

  console.log('--- AUDIT_COMPLETE: NOMINAL_STATE ---');
  process.exit(0);
}

validate();
