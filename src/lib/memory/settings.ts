import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CACHE_TTL = 60 * 1000; // 60 seconds

export interface SystemConfig {
  semantic_enabled: boolean;
  rag_enabled: boolean;
  model_override: string;
  thresholds: {
    entity_similarity: number;   // default 0.85
    verification_sources: number; // default 2
  };
  features: {
    enable_llm: boolean;
    enable_relationships: boolean;
    enable_reconciliation: boolean;
  };
}

/**
 * SettingsController: Singleton governance with memory caching.
 */
export class SettingsController {
  private static cache: { config: SystemConfig; timestamp: number } | null = null;
  private static singletonKey = 'global_config';

  /**
   * Fetches settings with 60s memory caching.
   */
  static async getSettings(): Promise<SystemConfig> {
    const now = Date.now();
    
    if (this.cache && (now - this.cache.timestamp) < CACHE_TTL) {
      return this.cache.config;
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { key: this.singletonKey }
    });

    if (!settings) {
      console.log('[Settings] No settings found. Initializing defaults...');
      settings = await this.autoInitialize();
    }

    const config = settings.value as unknown as SystemConfig;
    this.cache = { config, timestamp: now };
    
    return config;
  }

  /**
   * Auto-initialization (Safety Hook)
   */
  static async autoInitialize() {
    return prisma.systemSettings.upsert({
      where: { key: this.singletonKey },
      update: {},
      create: {
        key: this.singletonKey,
        value: {
          semantic_enabled: true,
          rag_enabled: true,
          model_override: 'gpt-4o-mini',
          thresholds: {
            entity_similarity: 0.85,
            verification_sources: 2
          },
          features: {
            enable_llm: true,
            enable_relationships: true,
            enable_reconciliation: true
          }
        } as any
      }
    });
  }

  /**
   * Manual refresh/update (Cache Busting)
   */
  static async updateSettings(updates: Partial<SystemConfig>) {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };

    const result = await prisma.systemSettings.update({
      where: { key: this.singletonKey },
      data: { 
        value: updated as any,
        last_updated: new Date()
      }
    });

    // Cache Bust
    this.cache = null; 
    return result;
  }

  /**
   * Force refresh
   */
  static refresh() {
    this.cache = null;
  }
}
