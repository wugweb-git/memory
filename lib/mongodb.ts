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
  throw new Error('Mongo URI is required (MONGODB_URI, MONGO_URI, or STORAGE_URL).');
}

const client = new MongoClient(uri, options);
attachDatabasePool(client);

export default client;
