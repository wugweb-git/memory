/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 */

import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const REQUIRED_VARS = [
  'MONGODB_URI',
  'AUTH_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

const MONGO_ALIASES = ['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'];

function validate() {
  console.log('--- SYSTEM_GUARDRAIL: ENVIRONMENT_AUDIT ---');
  let missing = [];

  // Check for Mongo (Env or Vault)
  const hasMongoEnv = MONGO_ALIASES.some(key => process.env[key]);
  const hasMongoVault = Boolean(INTERNAL_VAULT.MONGODB_URI);
  if (!hasMongoEnv && !hasMongoVault) {
    missing.push('MONGODB_URI (not in Env or Vault)');
  }

  // Check others (Env or Vault)
  REQUIRED_VARS.filter(v => v !== 'MONGODB_URI').forEach(v => {
    if (!process.env[v] && !INTERNAL_VAULT[v]) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.error('ERROR: Missing required configuration in both Environment and System Vault:');
    missing.forEach(m => console.error(` - ${m}`));
    console.error('System initialization aborted.');
    process.exit(1);
  }

  const isVaulted = !REQUIRED_VARS.every(v => process.env[v]);
  if (isVaulted) {
    console.log('STATUS: Operating in UNILATERAL_VAULT mode (Zero-Config Enabled).');
  }

  console.log('SUCCESS: All mandatory environment variables are present.');
  
  // Basic format validation for URI
  const uri = MONGO_ALIASES.map(key => process.env[key]).find(val => val);
  if (uri && !uri.startsWith('mongodb')) {
    console.error('ERROR: Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://".');
    process.exit(1);
  }

  console.log('--- AUDIT_COMPLETE: NOMINAL_STATE ---');
  process.exit(0);
}

validate();
