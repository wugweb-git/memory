import { Push_To_Blob } from '@/lib/blobLayer';

/**
 * Device capture (L0) — browser-permission-gated context signals.
 *
 * Every capture is user-initiated behind a real `navigator.*` permission prompt
 * (geolocation / clipboard / notifications). Nothing is captured silently. The
 * blob is tagged `device` / self-authored and held in the buffer for review.
 */

export type DeviceCaptureKind = 'geolocation' | 'clipboard' | 'notification';

export interface DeviceCaptureInput {
  kind: DeviceCaptureKind;
  data: Record<string, unknown>;
}

const MAX_CLIPBOARD_CHARS = 20_000;

export async function ingestDeviceCapture(input: DeviceCaptureInput) {
  const { kind } = input;
  let data = input.data ?? {};

  if (kind === 'clipboard' && typeof data.text === 'string') {
    data = { ...data, text: (data.text as string).slice(0, MAX_CLIPBOARD_CHARS) };
  }

  const item = await Push_To_Blob({
    type: `device_${kind}`,
    source: 'device',
    source_id: `device:${kind}:${data.capturedAt ?? ''}`,
    raw_payload: data,
    trace_json: {
      origin: 'device',
      input_mode: 'captured',
      declared_author: 'self',
      ingestion_path: 'ingest/device',
      device_kind: kind,
      received_at: new Date().toISOString(),
    },
  });

  return { source: 'device', kind, accepted: true, blob_id: item.id, state: item.state };
}
