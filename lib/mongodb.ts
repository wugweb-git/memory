import { MongoClient } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.STORAGE_URL ||
  "";

const options = {};

if (!uri) {
  throw new Error("Mongo URI is required (MONGO_URI, MONGODB_URI, or STORAGE_URL).");
}

const client = new MongoClient(uri, options);
attachDatabasePool(client);

export default client;
