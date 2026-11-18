'use client';

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { UI_API } from '@/lib/api/endpoints';

const DEVICE_FLAG = 'prism_passkey_device';

export function hasDevicePasskey(): boolean {
  try {
    return window.localStorage.getItem(DEVICE_FLAG) === '1';
  } catch {
    return false;
  }
}

export function setDevicePasskey(on: boolean) {
  try {
    if (on) window.localStorage.setItem(DEVICE_FLAG, '1');
    else window.localStorage.removeItem(DEVICE_FLAG);
  } catch {
    /* storage unavailable: the button simply stays hidden */
  }
}

export async function platformPasskeySupported(): Promise<boolean> {
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Something went wrong');
  return data as T;
}

function friendly(err: unknown, fallback: string): Error {
  if (err instanceof Error && err.name === 'NotAllowedError') return new Error('Cancelled or timed out');
  if (err instanceof Error && err.name === 'InvalidStateError') return new Error('This device is already added');
  return new Error(err instanceof Error && err.message ? err.message : fallback);
}

export async function registerThisDevice(deviceName: string): Promise<void> {
  try {
    const optionsJSON = await post<Parameters<typeof startRegistration>[0]['optionsJSON']>(UI_API.passkeyRegisterOptions);
    const response = await startRegistration({ optionsJSON });
    await post(UI_API.passkeyRegisterVerify, { response, deviceName });
    setDevicePasskey(true);
  } catch (err) {
    throw friendly(err, 'Could not add this device');
  }
}

export async function signInWithPasskey(remember: boolean): Promise<void> {
  try {
    const optionsJSON = await post<Parameters<typeof startAuthentication>[0]['optionsJSON']>(UI_API.passkeyLoginOptions);
    const response = await startAuthentication({ optionsJSON });
    await post(UI_API.passkeyLoginVerify, { response, remember });
    setDevicePasskey(true);
  } catch (err) {
    throw friendly(err, 'Biometric sign-in failed');
  }
}
