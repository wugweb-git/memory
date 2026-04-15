/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 */

import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const REQUIRED_VARS = [
  'AUTH_SECRET'
];

const MONGO_ALIASES = ['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'];

function validate() {
  console.log('--- SYSTEM_GUARDRAIL: ENVIRONMENT_AUDIT ---');
  let missing = [];

  // Check required vars (Env or Vault)
  REQUIRED_VARS.forEach(v => {
    if (!process.env[v] && !INTERNAL_VAULT[v]) {
      missing.push(v);
    }
  });

  const mongoUri = MONGO_ALIASES.map(key => process.env[key]).find(Boolean) || INTERNAL_VAULT.MONGODB_URI;
  if (!mongoUri) {
    missing.push('MONGODB_URI (or MONGO_URI / STORAGE_URL)');
  }

  if (missing.length > 0) {
    console.error('ERROR: Missing required configuration in both Environment and System Vault:');
    missing.forEach(m => console.error(` - ${m}`));
    if (missing.includes('AUTH_SECRET')) {
      console.error('TIP: Add AUTH_SECRET to your Vercel/Netlify project environment variables.');
    }
    if (missing.some((item) => item.startsWith('MONGODB_URI'))) {
      console.error('TIP: Configure Mongo using one of: MONGODB_URI, MONGO_URI, or STORAGE_URL.');
    }
    console.error('System initialization aborted.');
    process.exit(1);
  }

  const isVaulted = !REQUIRED_VARS.every(v => process.env[v]);
  if (isVaulted) {
    console.log('STATUS: Operating in UNILATERAL_VAULT mode (Zero-Config Enabled).');
  }

  console.log('SUCCESS: All mandatory environment variables are present.');
  
  // Optional format validation for URI when Mongo is set
  if (!mongoUri.startsWith('mongodb')) {
    console.error('ERROR: Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://".');
    process.exit(1);
  }

  console.log('--- AUDIT_COMPLETE: NOMINAL_STATE ---');
  process.exit(0);
}

validate();
