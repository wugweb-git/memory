export type MemoryType = 'email' | 'activity' | 'document' | 'note' | 'external';
export type SourceType = 'gmail' | 'github' | 'manual' | 'rss' | 'webhook' | 'api' | 'scraper' | 'unknown';
export type Sensitivity = 'normal' | 'restricted';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type IngestionDecision = 'ACCEPT' | 'HOLD' | 'REDIRECT' | 'REJECT';
export type PacketStatus = 'active' | 'partial' | 'failed' | 'archived';
export type EmbeddingStatus = 'pending' | 'processing' | 'embedded' | 'failed';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type WindowType = '7d' | '30d' | 'all';
export type SignalType = 'work_activity' | 'learning' | 'communication' | 'health' | 'finance' | 'creation' | 'consumption' | 'unknown';

export interface TraceSchema {
  origin: string;
  ingestion_path: string[];
  parent_origin_id: string | null;
  attempt_count: number;
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

  event_time: string;
  ingestion_time: string;
  last_updated: string;

  ownership: string;
  sensitivity: Sensitivity;

  priority: Priority;
  confidence: number;

  status: PacketStatus;
  hash: string;

  trace: TraceSchema;
  
  embedding_status: EmbeddingStatus;
  processing_status: ProcessingStatus;
  semantic_status: 'pending' | 'processing' | 'complete' | 'partial' | 'failed';
  
  attempt_count: number;
  max_retries: number;
  next_retry_at?: string;
  last_retried_at?: string;
  error_type?: 'transient' | 'permanent' | 'llm_unavailable';

  is_embeddable: boolean;
  schema_version: number;
  processing_errors: ProcessingError[];
  semantic_errors?: ProcessingError[];
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

export interface Signal {
  id?: string;
  packet_id: string;
  type: SignalType;
  category: string;
  source: string;
  
  intensity_absolute: number;
  intensity_relative: number;
  confidence: number;
  source_trust: number;
  
  timestamp: string;
  signal_hash: string;
  metadata: Record<string, any>;
}

export interface Pattern {
  id?: string;
  type: string;
  window_type: WindowType;
  confidence: number;
  signal_count: number;
  consistency_score: number;
  last_detected: string;
  metadata: Record<string, any>;
}

export interface SemanticObject {
  id?: string;
  packet_id: string;
  entities: Array<{ name: string; type: string; confidence: number; entity_id: string }>;
  intents: Array<{ intent: string; confidence: number }>;
  topics: Array<{ topic: string; confidence: number }>;
  model: string;
  confidence: number;
  verification_status: 'verified' | 'unverified';
  fallback: boolean;
  timestamp: string;
}

export interface Entity {
  id: string;
  name: string;
  normalized_name: string;
  type: string;
  confidence: number;
  verification_status: 'verified' | 'unverified';
  fallback: boolean;
  packet_ids: string[];
  occurrences: number;
  first_seen: string;
  last_seen: string;
}

export interface Relationship {
  id?: string;
  from_entity_id: string;
  to_entity_id: string;
  type: string;
  weight: number;
  packet_id: string;
  timestamp: string;
}
