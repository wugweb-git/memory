import { MemoryPacket } from './types';

export function shouldFilter(packet: MemoryPacket): { filtered: boolean; reason?: string } {
  // 1. Filter out low-signal GitHub commits (e.g., typo fixes)
  if (packet.source === 'github') {
    const description = String(packet.content?.description || '').toLowerCase();
    const lowSignalKeywords = ['typo', 'fix typo', 'formatting', 'cleanup', 'update readme'];
    if (lowSignalKeywords.some(keyword => description.includes(keyword))) {
      return { filtered: true, reason: 'LOW_SIGNAL_COMMIT_FILTERED' };
    }
  }

  // 2. Filter out empty or near-empty logs
  const contentStr = JSON.stringify(packet.content);
  if (!contentStr || contentStr === '{}' || contentStr.length < 10) {
    return { filtered: true, reason: 'EMPTY_OR_LOW_CONTENT_FILTERED' };
  }

  // 3. Filter out duplicate activity logs (e.g., repetitive RSS items without new info)
  // This is handled by the hash-based deduplication in the main service, 
  // but we can add specific logic here if needed.

  return { filtered: false };
}
