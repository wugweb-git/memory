export type PacketStatusView = { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: 'check' | 'alert' | 'x' | 'archive' };

export const PACKET_STATUSES = ['active', 'partial', 'failed', 'archived'] as const;

/** Real MemoryPacket.status values: active | partial | failed | archived. */
export function packetStatusView(status: unknown): PacketStatusView {
  switch (String(status)) {
    case 'active': return { label: 'Active', tone: 'success', icon: 'check' };
    case 'partial': return { label: 'Partial', tone: 'warning', icon: 'alert' };
    case 'failed': return { label: 'Failed', tone: 'danger', icon: 'x' };
    case 'archived': return { label: 'Archived', tone: 'neutral', icon: 'archive' };
    default: return { label: String(status || 'Unknown'), tone: 'neutral', icon: 'alert' };
  }
}
