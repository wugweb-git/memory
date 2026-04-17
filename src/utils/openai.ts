import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch, MongoDBAtlasVectorSearchLibArgs } from '@langchain/community/vectorstores/mongodb_atlas';
import { MongoClient } from 'mongodb';
import { config } from '../config';

let embeddingsInstance: OpenAIEmbeddings | null = null;
let client: MongoClient | null = null;

function getClient() {
  if (!client) {
    const uri = config.mongodbUri;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in Environment or System Vault');
    }
    client = new MongoClient(uri);
  }
  return client;
}

const namespace = 'identity-prism.embeddings';
const [dbName, collectionName] = namespace.split('.');

function getCollection() {
  return getClient().db(dbName).collection(collectionName);
}

export function getEmbeddingsTransformer(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({ 
      apiKey: config.openaiApiKey,
      modelName: 'text-embedding-3-small'
    });
  }
  return embeddingsInstance;
}

export function vectorStore(): MongoDBAtlasVectorSearch {
  return new MongoDBAtlasVectorSearch(getEmbeddingsTransformer(), searchArgs());
}

export function searchArgs(): MongoDBAtlasVectorSearchLibArgs {
  return {
    collection: getCollection(),
    indexName: 'vector_index',
    textKey: 'text_chunk',
    embeddingKey: 'embedding',
  };
}