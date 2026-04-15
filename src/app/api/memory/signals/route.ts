import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { config } from '@/config/runtime-config';

export const dynamic = 'force-dynamic';

/**
 * /api/memory/signals
 * Fetches the most recent ingestion activity from the Unified Memory Engine.
 */
export async function GET(req: NextRequest) {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.STORAGE_URL ||
    config.mongodbUri;

  if (!uri || !uri.startsWith('mongodb')) {
    return NextResponse.json([]);
  }

  let client: MongoClient | null = null;

  try {
    client = new MongoClient(uri);
    await client.connect();
    
    // Using the same namespace as defined in utils/openai.ts
    const db = client.db('chatter');
    const collection = db.collection('training_data');
    
    const signals = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    // Map MongoDB documents to the ActivityEntry interface
    const activityEntries = signals.map(s => ({
      id: s._id.toString(),
      type: s.sourceType === 'spirit_note' ? 'creation' : 'curation',
      action: s.sourceType === 'spirit_note' ? 'POST_PUBLISHED' : 'COLLECTOR_SAVE',
      target: s.text?.substring(0, 60) + '...',
      source: s.sourceOrigin || 'unknown',
      sourceUrl: s.sourceUrl || '#',
      time: s.timestamp ? new Date(s.timestamp).toLocaleString() : 'Recent',
      industry: s.industry_tag?.[0] || 'Uncategorized',
      spiritNote: s.spirit_note || s.text?.substring(0, 100) + '...'
    }));

    return NextResponse.json(activityEntries);
  } catch (error: any) {
    console.error('Signals Fetch Error:', error);
    return NextResponse.json([]);
  } finally {
    if (client) {
      await client.close();
    }
  }
}
