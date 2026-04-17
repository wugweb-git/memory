import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options: MongoClientOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 10000,
    connectTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise && uri) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise =
        globalWithMongo._mongoClientPromise ??
        Promise.reject(new Error('Please add your Mongo URI to .env'));
} else {
    // In production mode, it's best to not use a global variable.
    if (uri) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    } else {
        clientPromise = Promise.reject(new Error('Please add your Mongo URI to .env'));
    }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDb() {
    if (!uri) {
        throw new Error('Please add your Mongo URI to .env');
    }
    const client = await clientPromise;
    return client.db();
}
