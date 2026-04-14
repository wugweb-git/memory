import { connectDB } from '../lib/db.js';

async function run() {
  const result = await connectDB();
  console.log(`Storage ready: ${result.provider}`);
}

run().catch((error) => {
  console.error('Storage ping failed:', error.message);
  process.exit(1);
});
