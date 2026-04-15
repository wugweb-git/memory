import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { config } from '../../../../config/config.js';

export const dynamic = 'force-dynamic';

/**
 * /api/memory/signals
 * Fetches the most recent ingestion activity from the Unified Memory Engine.
 */
export async function GET(req: NextRequest) {
  try {
    const uri = config.mongodbUri;
    if (!uri) throw new Error("MONGODB_URI_MISSING");
    
    const client = new MongoClient(uri);
    await client.connect();
    
    // Using the same namespace as defined in utils/openai.ts
    const db = client.db('chatter');
    const collection = db.collection('training_data');
    
    const signals = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    await client.close();

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
