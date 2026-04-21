import { MongoClient, MongoClientOptions } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

import { config } from '../config/config.js';

const uri = config.mongodbUri;

const options: MongoClientOptions = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000
};

if (!uri) {
  const errorMessage = 'CRITICAL: MongoDB connection URI is missing from both Environment and System Vault.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const client = new MongoClient(uri, options);
attachDatabasePool(client);

export default client;
