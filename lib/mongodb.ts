import { MongoClient, MongoClientOptions } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.STORAGE_URL ||
  '';

const options: MongoClientOptions = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000
};

if (!uri) {
  const errorMessage = 'CRITICAL: MongoDB connection URI is missing. ' +
    'Please ensure MONGODB_URI, MONGO_URI, or STORAGE_URL is defined in your environment variables.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const client = new MongoClient(uri, options);
attachDatabasePool(client);

export default client;
