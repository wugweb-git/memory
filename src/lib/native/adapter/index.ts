import { createCapacitorAdapter } from './capacitor';
import { DEFAULT_IMPORTERS } from './capacitor-importers';
import { createPluginLoader, isNativePlatform, type PluginImporters } from './capacitor-shim';
import { createWebAdapter } from './web';
import type { NativeAdapter } from './types';

export * from './types';
export { createWebAdapter } from './web';
export { createCapacitorAdapter } from './capacitor';
export { createPluginLoader, isNativePlatform, PLUGIN_PACKAGES } from './capacitor-shim';

/** Pure selection logic, injectable for tests. */
export function createNativeAdapter(opts: { native: boolean; importers?: PluginImporters }): NativeAdapter {
  const web = createWebAdapter();
  return opts.native ? createCapacitorAdapter(createPluginLoader(opts.importers ?? DEFAULT_IMPORTERS), web) : web;
}

let cached: NativeAdapter | null = null;

/** The only entry point UI code should use. Capacitor shell when present, installed PWA/web otherwise. */
export function getNative(): NativeAdapter {
  if (!cached) cached = createNativeAdapter({ native: isNativePlatform() });
  return cached;
}
