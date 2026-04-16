export type MemoryType = 'email' | 'activity' | 'document' | 'note' | 'external';
export type SourceType = 'gmail' | 'github' | 'manual' | 'rss' | 'webhook' | 'api' | 'scraper' | 'unknown';
export type Sensitivity = 'normal' | 'restricted';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type IngestionDecision = 'ACCEPT' | 'HOLD' | 'REDIRECT' | 'REJECT';
export type PacketStatus = 'active' | 'partial' | 'failed' | 'archived';
export type EmbeddingStatus = 'pending' | 'processing' | 'embedded' | 'failed';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TraceSchema {
  origin: string;
  ingestion_path: string[];
  parent_origin_id: string | null;
  retry_count: number;
  error_reason?: string;
}

export interface ProcessingError {
  time: string;
  reason: string;
  level: 'warning' | 'error' | 'critical';
  stack?: string;
}

export interface MemoryPacket {
  id?: string;
  type: MemoryType;
  source: SourceType | string;
  source_id: string;

  content: any;
  metadata: Record<string, any>;

  timestamps: {
    event_time: string;
    ingestion_time: string;
    last_updated: string;
  };

  ownership: string;
  sensitivity: Sensitivity;

  priority: Priority;
  confidence: number;

  status: PacketStatus;
  hash: string;

  trace: TraceSchema;
  
  embedding_status: EmbeddingStatus;
  processing_status: ProcessingStatus;
  is_embeddable: boolean;
  schema_version: number;
  processing_errors: ProcessingError[];
}

export interface Source {
  id?: string;
  name: string;
  type: 'system' | 'manual' | 'external';
  
  trust_score: number;
  priority_level: Priority;

  auth_status: 'connected' | 'disconnected' | 'failed';
  last_sync: string | null;
  failure_count: number;
}
