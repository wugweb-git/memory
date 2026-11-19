export * from './capabilities';
export * from './ics';
export * from './deep-links';
export * from './share-data';
export * from './apps';
export * from './apps-ai';
export * from './location';
export * from './camera';
export * from './storage';
export * from './device-helpers';
export * from './browser';
export * from './adapter';
// Reuse the existing PWA helpers rather than duplicating them.
export { haptic, setAppBadge, isStandalone } from '../pwa/browser';
