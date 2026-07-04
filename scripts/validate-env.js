/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 * Single-database architecture: Neon/Postgres via brain_* vars (Mongo removed 2026-07).
 */

import { INTERNAL_VAULT } from '../lib/internal-vault.js';

const REQUIRED_VARS = ['AUTH_SECRET'];
const POSTGRES_ALIASES = ['brain_POSTGRES_PRISMA_URL', 'DATABASE_URL'];

function readValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function resolveRequiredValue(key) {
  return readValue(process.env[key]) || readValue(INTERNAL_VAULT[key]);
}

function resolvePostgresUrl() {
  return POSTGRES_ALIASES
    .map((key) => readValue(process.env[key]))
    .find(Boolean) || '';
}

function validate() {
  console.log('--- SYSTEM_GUARDRAIL: ENVIRONMENT_AUDIT ---');
  const missing = [];

  REQUIRED_VARS.forEach((key) => {
    if (!resolveRequiredValue(key)) {
      missing.push(key);
    }
  });

  const pgUrl = resolvePostgresUrl();
  if (!pgUrl) {
    missing.push('brain_POSTGRES_PRISMA_URL (or DATABASE_URL)');
  }

  if (missing.length > 0) {
    console.error('ERROR: Missing required configuration in both Environment and System Vault:');
    missing.forEach((key) => console.error(` - ${key}`));
    if (missing.includes('AUTH_SECRET')) {
      console.error('TIP: Add AUTH_SECRET to your Vercel project environment variables.');
    }
    if (missing.includes('brain_POSTGRES_PRISMA_URL (or DATABASE_URL)')) {
      console.error('TIP: Add the Neon brain_POSTGRES_* vars (Vercel Neon integration) so the app can reach the database.');
    }
    console.error('System initialization aborted.');
    process.exit(1);
  }

  console.log('SUCCESS: All mandatory environment variables are present.');

  if (!/^postgres(ql)?:\/\//.test(pgUrl)) {
    console.error('ERROR: Invalid Postgres URL format. Must start with "postgres://" or "postgresql://".');
    process.exit(1);
  }

  console.log('--- AUDIT_COMPLETE: NOMINAL_STATE ---');
  process.exit(0);
}

validate();
