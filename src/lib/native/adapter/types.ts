/**
 * Native bridge adapter contracts. UI code talks ONLY to these interfaces (via getNative()).
 * Two implementations exist: web (installed PWA, feature-detected) and Capacitor (inside an
 * Android shell, plugins loaded lazily). Both return the same result shapes.
 */
import type { IcsEvent } from '../ics';
import type { LocationErrorKind, Place } from '../location';
import type { CameraErrorKind } from '../camera';
import type { AppLauncher } from '../apps';

export type Impl = 'web' | 'capacitor';

export interface PickedContact {
  name: string;
  emails: string[];
  phones: string[];
}

export type CalendarMode = 'auto' | 'download' | 'share' | 'google';
export type CalendarResult =
  | { status: 'added' | 'opened' | 'downloaded' | 'shared' | 'cancelled'; via: Impl }
  | { status: 'failed'; via: Impl; message: string };

export interface CalendarAdapter {
  /** Web: .ics download/share or Google Calendar link. Capacitor: native event editor. */
  addEvent(ev: IcsEvent, mode?: CalendarMode): Promise<CalendarResult>;
}

export type ContactsResult =
  | { status: 'ok'; contacts: PickedContact[]; via: Impl }
  | { status: 'unsupported' | 'cancelled'; via: Impl }
  | { status: 'error'; via: Impl; message: string };

export interface ContactsAdapter {
  isSupported(): boolean;
  pick(opts?: { multiple?: boolean }): Promise<ContactsResult>;
}

export type LocationResult =
  | { status: 'ok'; place: Place; via: Impl }
  | { status: 'error'; kind: LocationErrorKind; message: string; via: Impl };

export interface LocationAdapter {
  isSupported(): boolean;
  /** Explicit user action only. One fix, 10 s timeout. */
  current(opts?: { highAccuracy?: boolean; timeoutMs?: number }): Promise<LocationResult>;
  permission(): Promise<'granted' | 'prompt' | 'denied' | null>;
}

export interface CapturedImage {
  dataUrl: string;
  width: number;
  height: number;
  mime: string;
  name?: string;
}
export type CameraResult =
  | { status: 'ok'; image?: CapturedImage; file?: File; via: Impl }
  | { status: 'cancelled'; via: Impl }
  | { status: 'error'; kind: CameraErrorKind; message: string; via: Impl };

export interface CameraAdapter {
  /** Photo (downscaled data URL) or video (raw File). Explicit tap only. */
  capture(kind: 'image' | 'video'): Promise<CameraResult>;
}

export type SaveResult = { status: 'saved' | 'downloaded' | 'cancelled'; via: Impl } | { status: 'error'; via: Impl; message: string };

export interface FilesAdapter {
  pick(opts?: { accept?: string; multiple?: boolean }): Promise<File[]>;
  save(file: { name: string; data: Blob | string; mime: string }): Promise<SaveResult>;
}

export type LaunchResult = { status: 'launched' | 'fallback'; via: Impl };

export interface AppsAdapter {
  /** Best-effort. Web cannot detect installed apps; Capacitor can via canOpenUrl. */
  open(launcher: Pick<AppLauncher, 'url' | 'fallbackUrl'>): Promise<LaunchResult>;
  /** Only the Capacitor shell can answer. Web returns null (unknown), never a guess. */
  isInstalled(launcherUrl: string): Promise<boolean | null>;
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';
export interface ShareAdapter {
  share(input: { title?: string; text?: string; url?: string; files?: File[] }): Promise<ShareOutcome>;
}

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';
export interface NotificationsAdapter {
  permission(): Promise<NotifyPermission>;
  request(): Promise<NotifyPermission>;
  /** Local notification on explicit tap. Remote push lives in src/lib/push. */
  notify(title: string, body: string): Promise<boolean>;
}

export interface NativeAdapter {
  impl: Impl;
  calendar: CalendarAdapter;
  contacts: ContactsAdapter;
  location: LocationAdapter;
  camera: CameraAdapter;
  files: FilesAdapter;
  apps: AppsAdapter;
  share: ShareAdapter;
  notifications: NotificationsAdapter;
}
