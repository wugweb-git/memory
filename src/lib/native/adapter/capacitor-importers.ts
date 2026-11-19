/**
 * The ONE file to edit when the Capacitor Android shell is added.
 * Capacitor is deliberately not a dependency yet, so every importer is empty and the adapter uses the web
 * implementation. After `npm i @capacitor/core @capacitor/geolocation ...` replace the empty object with:
 *
 *   geolocation: () => import('@capacitor/geolocation').then((m) => m.Geolocation),
 *   camera: () => import('@capacitor/camera').then((m) => m.Camera),
 *   filesystem: () => import('@capacitor/filesystem').then((m) => m.Filesystem),
 *   share: () => import('@capacitor/share').then((m) => m.Share),
 *   appLauncher: () => import('@capacitor/app-launcher').then((m) => m.AppLauncher),
 *   calendar: () => import('@capacitor-community/calendar').then((m) => m.CapacitorCalendar),
 *   contacts: () => import('@capacitor-community/contacts').then((m) => m.Contacts),
 *   localNotifications: () => import('@capacitor/local-notifications').then((m) => m.LocalNotifications),
 */
import type { PluginImporters } from './capacitor-shim';

export const DEFAULT_IMPORTERS: PluginImporters = {};
