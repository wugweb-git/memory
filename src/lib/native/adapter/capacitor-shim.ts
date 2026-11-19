/**
 * Type-safe lazy loader for Capacitor plugins. No Capacitor package is a dependency of this app.
 * The minimal plugin shapes below describe only what we call; verify them against the installed
 * plugin versions when the shell is added. A missing or failing plugin makes the adapter fall back to web.
 */

export interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

export function getCapacitor(g: any = typeof globalThis !== 'undefined' ? globalThis : {}): CapacitorGlobal | null {
  const c = g?.Capacitor ?? g?.window?.Capacitor;
  return c && typeof c === 'object' ? (c as CapacitorGlobal) : null;
}

export function isNativePlatform(g?: unknown): boolean {
  try {
    return getCapacitor(g as any)?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** @capacitor/geolocation */
export interface GeolocationPlugin {
  getCurrentPosition(o: { enableHighAccuracy?: boolean; timeout?: number }): Promise<{ coords: { latitude: number; longitude: number; accuracy?: number } }>;
  checkPermissions(): Promise<{ location: string }>;
  requestPermissions(): Promise<{ location: string }>;
}
/** @capacitor/camera */
export interface CameraPlugin {
  getPhoto(o: { quality?: number; resultType: string; source?: string; width?: number; height?: number; correctOrientation?: boolean }): Promise<{ dataUrl?: string; format?: string }>;
}
/** @capacitor/filesystem */
export interface FilesystemPlugin {
  writeFile(o: { path: string; data: string; directory?: string; encoding?: string; recursive?: boolean }): Promise<{ uri: string }>;
}
/** @capacitor/share */
export interface SharePlugin {
  share(o: { title?: string; text?: string; url?: string; files?: string[]; dialogTitle?: string }): Promise<unknown>;
}
/** @capacitor/app-launcher */
export interface AppLauncherPlugin {
  canOpenUrl(o: { url: string }): Promise<{ value: boolean }>;
  openUrl(o: { url: string }): Promise<{ completed: boolean }>;
}
/** @capacitor-community/calendar (API differs across majors; check the installed version) */
export interface CalendarPlugin {
  createEventWithPrompt(o: { title: string; location?: string; notes?: string; startDate: number; endDate: number; isAllDay?: boolean; url?: string }): Promise<unknown>;
}
/** @capacitor-community/contacts */
export interface ContactsPlugin {
  pickContact(o?: { projection?: Record<string, boolean> }): Promise<{ contact?: { name?: { display?: string; given?: string; family?: string }; emails?: { address?: string }[]; phones?: { number?: string }[] } }>;
}
/** @capacitor/local-notifications */
export interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(o: { notifications: { id: number; title: string; body: string }[] }): Promise<unknown>;
}

export interface PluginMap {
  geolocation: GeolocationPlugin;
  camera: CameraPlugin;
  filesystem: FilesystemPlugin;
  share: SharePlugin;
  appLauncher: AppLauncherPlugin;
  calendar: CalendarPlugin;
  contacts: ContactsPlugin;
  localNotifications: LocalNotificationsPlugin;
}
export type PluginName = keyof PluginMap;

export const PLUGIN_PACKAGES: Record<PluginName, string> = {
  geolocation: '@capacitor/geolocation',
  camera: '@capacitor/camera',
  filesystem: '@capacitor/filesystem',
  share: '@capacitor/share',
  appLauncher: '@capacitor/app-launcher',
  calendar: '@capacitor-community/calendar',
  contacts: '@capacitor-community/contacts',
  localNotifications: '@capacitor/local-notifications',
};

/** Each importer resolves to the plugin object itself (e.g. `Geolocation`). */
export type PluginImporters = { [K in PluginName]?: () => Promise<PluginMap[K]> };

export type PluginLoader = <K extends PluginName>(name: K) => Promise<PluginMap[K] | null>;

/** Memoised loader: returns null (never throws) when an importer is absent or fails. */
export function createPluginLoader(importers: PluginImporters): PluginLoader {
  const cache = new Map<PluginName, Promise<unknown>>();
  return async <K extends PluginName>(name: K) => {
    const imp = importers[name] as (() => Promise<PluginMap[K]>) | undefined;
    if (!imp) return null;
    if (!cache.has(name)) cache.set(name, imp().catch(() => null));
    return (await cache.get(name)) as PluginMap[K] | null;
  };
}
