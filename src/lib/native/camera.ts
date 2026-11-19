/** Pure camera helpers: downscale planning, error mapping and capture payload shaping. */

export const MAX_IMAGE_EDGE = 1600;
export const JPEG_QUALITY = 0.8;

/** Fit within maxEdge keeping aspect ratio; never upscale. */
export function planDownscale(w: number, h: number, maxEdge: number = MAX_IMAGE_EDGE): { width: number; height: number; scaled: boolean } {
  if (!(w > 0) || !(h > 0)) return { width: 0, height: 0, scaled: false };
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { width: Math.round(w), height: Math.round(h), scaled: false };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)), scaled: true };
}

export type CameraErrorKind = 'denied' | 'no-device' | 'busy' | 'unsupported' | 'unknown';

export function mapCameraError(err: unknown): CameraErrorKind {
  const name = err && typeof err === 'object' ? String((err as { name?: string }).name ?? '') : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  if (name === 'TypeError') return 'unsupported';
  return 'unknown';
}

export function cameraErrorMessage(kind: CameraErrorKind): string {
  switch (kind) {
    case 'denied': return 'Camera permission was denied. Allow it in Android site settings, or use the photo button instead.';
    case 'no-device': return 'No camera was found on this device.';
    case 'busy': return 'The camera is in use by another app.';
    case 'unsupported': return 'The live viewfinder is not supported here. Use the photo button instead.';
    default: return 'Could not open the camera.';
  }
}

/** Rough decoded size of a data URL, to keep offline payloads bounded. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  return i < 0 ? 0 : Math.floor(((dataUrl.length - i - 1) * 3) / 4);
}

export function buildImageCaptureBody(
  img: { dataUrl: string; width: number; height: number; name?: string; mime: string },
  now: Date = new Date(),
) {
  return {
    type: 'camera_image',
    source: 'device_camera',
    raw_payload: {
      filename: img.name ?? null,
      mime: img.mime,
      width: img.width,
      height: img.height,
      bytes: dataUrlBytes(img.dataUrl),
      data_url: img.dataUrl,
    },
    trace_json: { origin: 'device_camera', ingestion_path: 'buffer/camera', received_at: now.toISOString() },
  };
}
