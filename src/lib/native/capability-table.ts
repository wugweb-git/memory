import type { CapabilityKey } from './capabilities';

export type SupportLevel = 'Supported' | 'Partial' | 'Chromium-only' | 'Not possible from a PWA';

export interface CapabilityRow {
  key: CapabilityKey;
  label: string;
  /** Android Chrome support level. */
  level: SupportLevel;
  note: string;
  /** Name of a try action implemented by CapabilitiesPanel, if any. */
  tryAction?: string;
}

/** Single source for the Capabilities panel and docs/native-bridge.md. */
export const CAPABILITY_TABLE: CapabilityRow[] = [
  { key: 'share', label: 'Share sheet', level: 'Supported', note: 'navigator.share; falls back to copy link', tryAction: 'share' },
  { key: 'shareFiles', label: 'Share files', level: 'Supported', note: 'canShare({files}); .ics, text, images' },
  { key: 'clipboardWrite', label: 'Clipboard write', level: 'Supported', note: 'Needs user gesture; execCommand fallback', tryAction: 'copy' },
  { key: 'clipboardRead', label: 'Clipboard read', level: 'Partial', note: 'Only on tap, Chrome shows a paste prompt', tryAction: 'paste' },
  { key: 'contactPicker', label: 'Contact picker', level: 'Chromium-only', note: 'Android Chrome 80+, user picks; no silent reads', tryAction: 'contacts' },
  { key: 'geolocation', label: 'Location (one fix)', level: 'Supported', note: 'Foreground only; no background tracking', tryAction: 'location' },
  { key: 'camera', label: 'Camera', level: 'Supported', note: 'capture attribute (system camera) and getUserMedia', tryAction: 'camera' },
  { key: 'wakeLock', label: 'Screen wake lock', level: 'Supported', note: 'Released when the tab is hidden', tryAction: 'wakelock' },
  { key: 'vibrate', label: 'Vibration', level: 'Chromium-only', note: 'Not on iOS; reuses haptic()', tryAction: 'vibrate' },
  { key: 'badging', label: 'App badge', level: 'Partial', note: 'Installed PWA; shows a dot on most launchers', tryAction: 'badge' },
  { key: 'notifications', label: 'Local notifications', level: 'Supported', note: 'Push itself lives in src/lib/push', tryAction: 'notify' },
  { key: 'serviceWorker', label: 'Service worker', level: 'Supported', note: 'Offline shell and capture queue' },
  { key: 'backgroundSync', label: 'Background Sync', level: 'Chromium-only', note: 'Replays offline captures', tryAction: 'sync-status' },
  { key: 'periodicSync', label: 'Periodic Background Sync', level: 'Chromium-only', note: 'Installed PWA with high engagement only; not guaranteed' },
  { key: 'speechRecognition', label: 'Speech recognition', level: 'Partial', note: 'Chrome sends audio to Google; needs network', tryAction: 'dictate' },
  { key: 'speechSynthesis', label: 'Read aloud', level: 'Supported', note: 'Uses the device TTS voice', tryAction: 'speak' },
  { key: 'webNfc', label: 'NFC tags', level: 'Chromium-only', note: 'Android Chrome 89+, tap to scan; read/write NDEF', tryAction: 'nfc' },
  { key: 'webBluetooth', label: 'Web Bluetooth', level: 'Chromium-only', note: 'User picks a device; not detected here beyond API presence' },
  { key: 'webUsb', label: 'Web USB', level: 'Chromium-only', note: 'User picks a device' },
  { key: 'mediaSession', label: 'Media Session', level: 'Supported', note: 'Lock-screen controls while media plays' },
  { key: 'pictureInPicture', label: 'Picture in picture', level: 'Partial', note: 'Video elements only' },
  { key: 'screenCapture', label: 'Screen capture', level: 'Not possible from a PWA', note: 'getDisplayMedia is not available in Android Chrome', tryAction: 'screenshot' },
  { key: 'networkInformation', label: 'Network information', level: 'Chromium-only', note: 'effectiveType and save-data', tryAction: 'network' },
  { key: 'battery', label: 'Battery status', level: 'Partial', note: 'Chrome only, secure context; may be removed', tryAction: 'battery' },
  { key: 'deviceOrientation', label: 'Device orientation', level: 'Supported', note: 'Opt-in; no permission prompt on Android' },
  { key: 'deviceMotion', label: 'Device motion', level: 'Supported', note: 'Opt-in' },
  { key: 'fullscreen', label: 'Fullscreen', level: 'Supported', note: 'Requires a user gesture', tryAction: 'fullscreen' },
  { key: 'paymentRequest', label: 'Payment Request', level: 'Partial', note: 'Documented only; this app does not take payments' },
  { key: 'credentialManagement', label: 'Credential management', level: 'Supported', note: 'navigator.credentials' },
  { key: 'webAuthn', label: 'Passkeys (WebAuthn)', level: 'Supported', note: 'Already used for sign-in, see src/lib/passkey-client.ts' },
  { key: 'idleDetection', label: 'Idle detection', level: 'Chromium-only', note: 'Needs a permission prompt; 60 s minimum threshold' },
  { key: 'fileHandling', label: 'File handling', level: 'Not possible from a PWA', note: 'Desktop Chromium only; use the share target on Android' },
  { key: 'launchHandler', label: 'Launch handler', level: 'Partial', note: 'launch_handler manifest key reuses the open window' },
  { key: 'protocolHandlers', label: 'web+ protocol handlers', level: 'Partial', note: 'registerProtocolHandler for web+ schemes; limited on Android', tryAction: 'protocol' },
  { key: 'fileSystemAccess', label: 'File System Access', level: 'Partial', note: 'showSaveFilePicker works on recent Android Chrome; falls back to download' },
  { key: 'opfs', label: 'Origin private file system', level: 'Supported', note: 'Private, large offline files' },
  { key: 'storageEstimate', label: 'Storage estimate', level: 'Supported', note: 'navigator.storage.estimate()' },
  { key: 'storagePersist', label: 'Persistent storage', level: 'Partial', note: 'Granted heuristically (installed or engaged sites)' },
  { key: 'installedRelatedApps', label: 'Related installed apps', level: 'Partial', note: 'Reports only apps related in the manifest; cannot list installed apps' },
];

/** Things no PWA can do, which need the Capacitor or Kotlin shell. */
export const IMPOSSIBLE_FROM_PWA: { what: string; shell: string }[] = [
  { what: 'Read the device calendar silently', shell: '@capacitor-community/calendar (READ_CALENDAR)' },
  { what: 'Read contacts silently', shell: '@capacitor-community/contacts (READ_CONTACTS)' },
  { what: 'Read SMS or the call log', shell: 'Kotlin plugin; Google Play restricts these permissions' },
  { what: 'List installed apps or usage stats', shell: 'Kotlin plugin with QUERY_ALL_PACKAGES / PACKAGE_USAGE_STATS (Play restricted)' },
  { what: 'Background or continuous location', shell: '@capacitor-community/background-geolocation (foreground service)' },
  { what: 'Accessibility services, widgets, default-app registration', shell: 'Native Kotlin code' },
  { what: 'Silent Drive browsing', shell: 'Server-side Google Drive connector (OAuth) already exists' },
];
