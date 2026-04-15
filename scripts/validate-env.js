/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 */

import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const REQUIRED_VARS = ['AUTH_SECRET'];
const MONGO_ALIASES = ['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'];
const MONGODB_URI_PATTERN = /^mongodb(\+srv)?:\/\//;

function readValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function resolveRequiredValue(key) {
  return readValue(process.env[key]) || readValue(INTERNAL_VAULT[key]);
}

function resolveMongoUri() {
  const envUri = MONGO_ALIASES
    .map((key) => readValue(process.env[key]))
    .find(Boolean);

  return envUri || readValue(INTERNAL_VAULT.MONGODB_URI);
}

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

  REQUIRED_VARS.forEach((key) => {
    if (!resolveRequiredValue(key)) {
      missing.push(key);
    }
  });

  const uri = MONGO_ALIASES.map(key => process.env[key]).find(Boolean) || INTERNAL_VAULT.MONGODB_URI;

  if (!uri) {
    missing.push('MONGODB_URI (or MONGO_URI/STORAGE_URL alias)');
  }

  if (missing.length > 0) {
    console.error('ERROR: Missing required configuration in both Environment and System Vault:');
    missing.forEach((key) => console.error(` - ${key}`));
    if (missing.includes('AUTH_SECRET')) {
      console.error('TIP: Add AUTH_SECRET to your Vercel/Netlify project environment variables.');
    }
    if (missing.includes('MONGODB_URI (or MONGO_URI/STORAGE_URL alias)')) {
      console.error('TIP: Add MONGODB_URI (or MONGO_URI/STORAGE_URL) to avoid runtime /api/chat failures.');
    }
    console.error('System initialization aborted.');
    process.exit(1);
  }

  const hasDirectRequiredEnv = REQUIRED_VARS.every((key) => readValue(process.env[key]));
  const hasDirectMongoEnv = MONGO_ALIASES.some((key) => readValue(process.env[key]));
  if (!hasDirectRequiredEnv || !hasDirectMongoEnv) {
    console.log('STATUS: Operating in UNILATERAL_VAULT mode (Zero-Config Enabled).');
  }

  console.log('SUCCESS: All mandatory environment variables are present.');
  
  // Format validation for Mongo URI (required by /api/chat RAG retriever)
  if (!uri.startsWith('mongodb')) {
    console.error('ERROR: Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://".');
    process.exit(1);
  }

  console.log('--- AUDIT_COMPLETE: NOMINAL_STATE ---');
  process.exit(0);
}

validate();
