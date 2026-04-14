import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch, MongoDBAtlasVectorSearchLibArgs } from '@langchain/community/vectorstores/mongodb_atlas';
import { MongoClient } from 'mongodb';
import { config } from '../../config/config.js';

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

const namespace = 'chatter.training_data';
const [dbName, collectionName] = namespace.split('.');

function getCollection() {
  return getClient().db(dbName).collection(collectionName);
}

export function getEmbeddingsTransformer(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({ openAIApiKey: config.openaiApiKey });
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
    textKey: 'text',
    embeddingKey: 'text_embedding',
  };
}