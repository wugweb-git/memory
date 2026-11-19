/**
 * Native device bridge: capability detection.
 * Pure over an injectable environment so it can be unit tested without a browser.
 * Every flag means "the web platform API exists here"; it never means permission was granted.
 */

export interface Capabilities {
  android: boolean;
  standalone: boolean;
  share: boolean;
  shareFiles: boolean;
  clipboardWrite: boolean;
  clipboardRead: boolean;
  contactPicker: boolean;
  wakeLock: boolean;
  vibrate: boolean;
  badging: boolean;
  geolocation: boolean;
  notifications: boolean;
  serviceWorker: boolean;
  backgroundSync: boolean;
  periodicSync: boolean;
  fileHandling: boolean;
  launchHandler: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  webNfc: boolean;
  webBluetooth: boolean;
  webUsb: boolean;
  mediaSession: boolean;
  pictureInPicture: boolean;
  screenCapture: boolean;
  camera: boolean;
  networkInformation: boolean;
  battery: boolean;
  deviceOrientation: boolean;
  deviceMotion: boolean;
  fullscreen: boolean;
  paymentRequest: boolean;
  credentialManagement: boolean;
  webAuthn: boolean;
  idleDetection: boolean;
  protocolHandlers: boolean;
  fileSystemAccess: boolean;
  opfs: boolean;
  storageEstimate: boolean;
  storagePersist: boolean;
  installedRelatedApps: boolean;
}

export type CapabilityKey = keyof Capabilities;

export const NO_CAPABILITIES: Capabilities = {
  android: false, standalone: false, share: false, shareFiles: false, clipboardWrite: false,
  clipboardRead: false, contactPicker: false, wakeLock: false, vibrate: false, badging: false,
  geolocation: false, notifications: false, serviceWorker: false, backgroundSync: false,
  periodicSync: false, fileHandling: false, launchHandler: false, speechRecognition: false,
  speechSynthesis: false, webNfc: false, webBluetooth: false, webUsb: false, mediaSession: false,
  pictureInPicture: false, screenCapture: false, camera: false, networkInformation: false,
  battery: false, deviceOrientation: false, deviceMotion: false, fullscreen: false,
  paymentRequest: false, credentialManagement: false, webAuthn: false, idleDetection: false,
  protocolHandlers: false, fileSystemAccess: false, opfs: false, storageEstimate: false,
  storagePersist: false, installedRelatedApps: false,
};

type Env = { navigator?: any; window?: any; document?: any; Notification?: unknown; File?: any } & Record<string, any>;

function probeShareFiles(nav: any, FileCtor: any): boolean {
  if (typeof nav?.canShare !== 'function' || typeof FileCtor !== 'function') return false;
  try {
    return nav.canShare({ files: [new FileCtor(['x'], 'x.txt', { type: 'text/plain' })] }) === true;
  } catch {
    return false;
  }
}

export function detectCapabilities(env?: Env): Capabilities {
  const g: any = env ?? (typeof globalThis !== 'undefined' ? globalThis : {});
  const nav: any = g.navigator;
  const win: any = g.window ?? g;
  const doc: any = g.document ?? win.document;
  if (!nav) return { ...NO_CAPABILITIES };
  const has = (k: string) => typeof (g[k] ?? win[k]) !== 'undefined';
  const fn = (o: any, k: string) => typeof o?.[k] === 'function';

  let standalone = false;
  try {
    standalone = Boolean(win.matchMedia?.('(display-mode: standalone)')?.matches) || nav.standalone === true;
  } catch {
    standalone = false;
  }

  return {
    android: /Android/i.test(String(nav.userAgent ?? '')),
    standalone,
    share: fn(nav, 'share'),
    shareFiles: probeShareFiles(nav, g.File ?? win.File),
    clipboardWrite: fn(nav.clipboard, 'writeText'),
    clipboardRead: fn(nav.clipboard, 'readText'),
    contactPicker: Boolean(nav.contacts) && fn(nav.contacts, 'select'),
    wakeLock: Boolean(nav.wakeLock) && fn(nav.wakeLock, 'request'),
    vibrate: fn(nav, 'vibrate'),
    badging: fn(nav, 'setAppBadge'),
    geolocation: Boolean(nav.geolocation) && fn(nav.geolocation, 'getCurrentPosition'),
    notifications: has('Notification'),
    serviceWorker: Boolean(nav.serviceWorker),
    backgroundSync: has('SyncManager'),
    periodicSync: has('PeriodicSyncManager'),
    fileHandling: has('LaunchParams') && 'launchQueue' in win,
    launchHandler: has('LaunchParams'),
    speechRecognition: has('SpeechRecognition') || has('webkitSpeechRecognition'),
    speechSynthesis: has('speechSynthesis') && has('SpeechSynthesisUtterance'),
    webNfc: has('NDEFReader'),
    webBluetooth: Boolean(nav.bluetooth),
    webUsb: Boolean(nav.usb),
    mediaSession: Boolean(nav.mediaSession),
    pictureInPicture: Boolean(doc?.pictureInPictureEnabled),
    screenCapture: fn(nav.mediaDevices, 'getDisplayMedia'),
    camera: fn(nav.mediaDevices, 'getUserMedia'),
    networkInformation: Boolean(nav.connection),
    battery: fn(nav, 'getBattery'),
    deviceOrientation: has('DeviceOrientationEvent'),
    deviceMotion: has('DeviceMotionEvent'),
    fullscreen: Boolean(doc?.fullscreenEnabled),
    paymentRequest: has('PaymentRequest'),
    credentialManagement: Boolean(nav.credentials),
    webAuthn: has('PublicKeyCredential'),
    idleDetection: has('IdleDetector'),
    protocolHandlers: fn(nav, 'registerProtocolHandler'),
    fileSystemAccess: fn(win, 'showSaveFilePicker') || fn(win, 'showOpenFilePicker'),
    opfs: fn(nav.storage, 'getDirectory'),
    storageEstimate: fn(nav.storage, 'estimate'),
    storagePersist: fn(nav.storage, 'persist'),
    installedRelatedApps: fn(nav, 'getInstalledRelatedApps'),
  };
}
