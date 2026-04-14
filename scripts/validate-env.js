/**
 * Environment Validation Guardrail
 * Ensures all required environment variables are present and correctly formatted.
 */

const REQUIRED_VARS = [
  'MONGODB_URI',
  'AUTH_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

// Open-source friendly aliases for MongoDB
const MONGO_ALIASES = ['MONGODB_URI', 'MONGO_URI', 'STORAGE_URL'];

function validate() {
  console.log('--- SYSTEM_GUARDRAIL: ENVIRONMENT_AUDIT ---');
  let missing = [];

  // Check for Mongo specifically (one of the aliases must be present)
  const hasMongo = MONGO_ALIASES.some(key => process.env[key]);
  if (!hasMongo) {
    missing.push('MONGODB_URI (or MONGO_URI/STORAGE_URL)');
  }

  // Check others
  REQUIRED_VARS.filter(v => v !== 'MONGODB_URI').forEach(v => {
    if (!process.env[v]) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.error('ERROR: Missing required environment variables:');
    missing.forEach(m => console.error(` - ${m}`));
    console.error('System initialization aborted.');
    process.exit(1);
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
