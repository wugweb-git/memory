/**
 * "Open in app" launchers for popular Android apps. Pure URL builders.
 *
 * A PWA cannot list installed apps or detect whether one is present. Each launcher is therefore
 * best-effort: Chrome Android intent:// URLs (documented format
 *   intent:DATA#Intent;scheme=SCHEME;package=PKG;S.browser_fallback_url=ENCODED_URL;end )
 * open the app when installed and otherwise navigate to the browser_fallback_url (the web version).
 * Plain https links are used where the app claims them via Android App Links.
 */
import { isEmail, isValidCoordinate, normalizePhone } from './deep-links';
import { googleCalendarUrl, type IcsEvent } from './ics';

export interface IntentSpec {
  /** Everything after "scheme:" e.g. "//track/abc" (hierarchical) or "a@b.com?subject=x" (opaque). */
  data: string;
  scheme: string;
  package?: string;
  /** Required: http(s) URL opened when the app is missing. */
  fallbackUrl: string;
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*$/;
const PACKAGE_RE = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;

function isHttpUrl(u: string): boolean {
  try {
    const p = new URL(u).protocol;
    return p === 'https:' || p === 'http:';
  } catch {
    return false;
  }
}

/** Throws on malformed input so a bad URL is never emitted. */
export function buildIntentUrl(spec: IntentSpec): string {
  if (!SCHEME_RE.test(spec.scheme)) throw new RangeError('invalid intent scheme');
  if (spec.package && !PACKAGE_RE.test(spec.package)) throw new RangeError('invalid android package');
  if (!isHttpUrl(spec.fallbackUrl)) throw new RangeError('fallbackUrl must be http(s)');
  if (/[#;]/.test(spec.data)) throw new RangeError('intent data must not contain # or ;');
  const parts = [`scheme=${spec.scheme}`];
  if (spec.package) parts.push(`package=${spec.package}`);
  parts.push(`S.browser_fallback_url=${encodeURIComponent(spec.fallbackUrl)}`);
  return `intent:${spec.data}#Intent;${parts.join(';')};end`;
}

export type LaunchKind = 'intent' | 'https' | 'scheme';

export interface AppLauncher {
  id: string;
  app: string;
  label: string;
  url: string;
  kind: LaunchKind;
  /** The web URL the launcher degrades to. */
  fallbackUrl: string;
}

export interface LaunchContext {
  title?: string;
  text?: string;
  url?: string;
  phone?: string;
  email?: string;
  address?: string;
  lat?: number;
  lng?: number;
  query?: string;
  event?: IcsEvent;
  /** Spotify entity, e.g. { type: 'track', id: '...' }. */
  spotify?: { type: 'track' | 'album' | 'artist' | 'playlist'; id: string };
  meetingId?: string;
}

const enc = encodeURIComponent;
const compact = <T>(xs: (T | null)[]): T[] => xs.filter((x): x is T => x !== null);

function intent(
  id: string, app: string, label: string, spec: IntentSpec,
): AppLauncher {
  return { id, app, label, url: buildIntentUrl(spec), kind: 'intent', fallbackUrl: spec.fallbackUrl };
}
function https(id: string, app: string, label: string, url: string): AppLauncher {
  return { id, app, label, url, kind: 'https', fallbackUrl: url };
}
/** Opens the installed app through an https App Link intent for a known package, else the web page. */
function httpsIntent(id: string, app: string, label: string, url: string, pkg: string): AppLauncher {
  const u = new URL(url);
  return intent(id, app, label, { data: `//${u.host}${u.pathname}${u.search}`, scheme: u.protocol.replace(':', ''), package: pkg, fallbackUrl: url });
}

/** Plain-text body shared to other apps. */
function shareBody(c: LaunchContext): string {
  return [c.text?.trim(), c.url?.trim()].filter(Boolean).join('\n') || c.title?.trim() || '';
}

export function spotifyUri(type: string, id: string): string | null {
  return /^(track|album|artist|playlist)$/.test(type) && /^[A-Za-z0-9]{10,32}$/.test(id) ? `spotify:${type}:${id}` : null;
}

export function appLaunchers(c: LaunchContext): AppLauncher[] {
  const out: AppLauncher[] = [];
  const body = shareBody(c);
  const q = c.query?.trim() || c.address?.trim() || c.title?.trim() || '';
  const phone = c.phone ? normalizePhone(c.phone) : null;
  const hasCoords = typeof c.lat === 'number' && typeof c.lng === 'number' && isValidCoordinate(c.lat, c.lng);

  /* Messaging / sharing */
  if (body || phone) {
    const waWeb = `https://wa.me/${phone ? phone.replace('+', '') : ''}${body ? `?text=${enc(body)}` : ''}`;
    out.push(intent('whatsapp.share', 'WhatsApp', phone ? 'Message in WhatsApp' : 'Share to WhatsApp', {
      data: `//send?${phone ? `phone=${phone.replace('+', '')}&` : ''}${body ? `text=${enc(body)}` : ''}`.replace(/[?&]$/, ''),
      scheme: 'whatsapp', package: 'com.whatsapp', fallbackUrl: waWeb,
    }));
  }
  if (body) {
    const tgWeb = `https://t.me/share/url?url=${enc(c.url ?? ' ')}&text=${enc(c.text ?? c.title ?? '')}`;
    out.push(intent('telegram.share', 'Telegram', 'Share to Telegram', {
      data: `//msg_url?url=${enc(c.url ?? ' ')}&text=${enc(c.text ?? c.title ?? '')}`,
      scheme: 'tg', package: 'org.telegram.messenger', fallbackUrl: tgWeb,
    }));
  }
  if (phone) {
    out.push(https('signal.chat', 'Signal', 'Open in Signal', `https://signal.me/#p/${enc(phone)}`));
  }
  if (body) {
    out.push(https('x.post', 'X', 'Post on X', `https://x.com/intent/post?text=${enc(c.text ?? c.title ?? '')}${c.url ? `&url=${enc(c.url)}` : ''}`));
    out.push(https('linkedin.share', 'LinkedIn', 'Share on LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(c.url ?? 'https://www.linkedin.com')}`));
    out.push(https('facebook.share', 'Facebook', 'Share on Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(c.url ?? 'https://www.facebook.com')}`));
  }
  if (c.url) {
    out.push(https('pocket.save', 'Pocket', 'Save to Pocket', `https://getpocket.com/save?url=${enc(c.url)}`));
    out.push(intent('chrome.open', 'Chrome', 'Open in Chrome', (() => {
      const u = new URL(c.url);
      return { data: `//${u.host}${u.pathname}${u.search}`, scheme: u.protocol.replace(':', ''), package: 'com.android.chrome', fallbackUrl: c.url };
    })()));
  }
  if (c.title || c.text) {
    out.push(https('trello.card', 'Trello', 'Add card in Trello', `https://trello.com/add-card?name=${enc(c.title ?? c.text ?? '')}&desc=${enc(shareBody(c))}`));
    out.push(https('todoist.add', 'Todoist', 'Add to Todoist', `https://todoist.com/add?content=${enc(c.title ?? c.text ?? '')}`));
  }

  /* Mail */
  if (c.email && isEmail(c.email) || body) {
    const to = c.email && isEmail(c.email) ? c.email : '';
    const subject = c.title?.trim() ?? '';
    const qs = [subject && `subject=${enc(subject)}`, body && `body=${enc(body)}`].filter(Boolean).join('&');
    const mailto = `mailto:${to}${qs ? `?${qs}` : ''}`;
    const gmailWeb = `https://mail.google.com/mail/?view=cm&fs=1${to ? `&to=${enc(to)}` : ''}${subject ? `&su=${enc(subject)}` : ''}${body ? `&body=${enc(body)}` : ''}`;
    out.push(intent('gmail.compose', 'Gmail', 'Compose in Gmail', { data: `${to}${qs ? `?${qs}` : ''}`, scheme: 'mailto', package: 'com.google.android.gm', fallbackUrl: gmailWeb }));
    out.push({ id: 'mail.mailto', app: 'Email', label: 'Send this note by email', url: mailto, kind: 'scheme', fallbackUrl: gmailWeb });
    out.push(intent('outlook.compose', 'Outlook', 'Compose in Outlook', {
      data: `//compose?${[to && `to=${enc(to)}`, qs].filter(Boolean).join('&')}`, scheme: 'ms-outlook', package: 'com.microsoft.office.outlook',
      fallbackUrl: `https://outlook.live.com/mail/0/deeplink/compose?${[to && `to=${enc(to)}`, qs].filter(Boolean).join('&')}`,
    }));
  }
  if (q) {
    out.push(https('gmail.search', 'Gmail', 'Search in Gmail', `https://mail.google.com/mail/u/0/#search/${enc(q)}`));
  }

  /* Maps & rides */
  if (hasCoords) {
    const lat = c.lat as number, lng = c.lng as number;
    const ll = `${lat},${lng}`;
    out.push(intent('maps.open', 'Google Maps', 'Open in Maps', {
      data: `//www.google.com/maps/search/?api=1&query=${enc(ll)}`, scheme: 'https', package: 'com.google.android.apps.maps',
      fallbackUrl: `https://www.google.com/maps/search/?api=1&query=${enc(ll)}`,
    }));
    out.push(intent('waze.navigate', 'Waze', 'Navigate with Waze', {
      data: `//?ll=${ll}&navigate=yes`, scheme: 'waze', package: 'com.waze', fallbackUrl: `https://waze.com/ul?ll=${enc(ll)}&navigate=yes`,
    }));
    out.push(https('uber.ride', 'Uber', 'Ride with Uber', `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`));
  } else if (c.address?.trim()) {
    const a = c.address.trim();
    out.push(httpsIntent('maps.open', 'Google Maps', 'Open address in Maps', `https://www.google.com/maps/search/?api=1&query=${enc(a)}`, 'com.google.android.apps.maps'));
    out.push(https('waze.search', 'Waze', 'Search in Waze', `https://waze.com/ul?q=${enc(a)}`));
  }

  /* Calendar */
  if (c.event) out.push(httpsIntent('gcal.create', 'Google Calendar', 'Create event in Google Calendar', googleCalendarUrl(c.event), 'com.google.android.calendar'));

  /* Spotify */
  if (c.spotify) {
    const uri = spotifyUri(c.spotify.type, c.spotify.id);
    if (uri) {
      out.push(intent('spotify.open', 'Spotify', `Open ${c.spotify.type} in Spotify`, {
        data: `//${c.spotify.type}/${c.spotify.id}`, scheme: 'spotify', package: 'com.spotify.music',
        fallbackUrl: `https://open.spotify.com/${c.spotify.type}/${c.spotify.id}`,
      }));
    }
  }
  if (q) {
    out.push(intent('spotify.search', 'Spotify', 'Search in Spotify', {
      data: `//search/${enc(q)}`, scheme: 'spotify', package: 'com.spotify.music', fallbackUrl: `https://open.spotify.com/search/${enc(q)}`,
    }));
    out.push(httpsIntent('youtube.search', 'YouTube', 'Search on YouTube', `https://www.youtube.com/results?search_query=${enc(q)}`, 'com.google.android.youtube'));
    out.push(httpsIntent('drive.search', 'Google Drive', 'Search in Drive', `https://drive.google.com/drive/search?q=${enc(q)}`, 'com.google.android.apps.docs'));
  }

  /* Meetings */
  if (c.meetingId && /^[\d\s-]{6,15}$/.test(c.meetingId)) {
    const id = c.meetingId.replace(/\D/g, '');
    out.push(intent('zoom.join', 'Zoom', 'Join in Zoom', { data: `//zoom.us/join?confno=${id}`, scheme: 'zoommtg', package: 'us.zoom.videomeetings', fallbackUrl: `https://zoom.us/j/${id}` }));
  }

  return out;
}

export interface StaticApp { id: string; app: string; label: string; url: string; kind: LaunchKind; fallbackUrl: string }

/** Context-free "just open the app" launchers. */
export function openAppLaunchers(): AppLauncher[] {
  const open = (id: string, app: string, spec: { scheme: string; data?: string; pkg: string; web: string }) =>
    intent(id, app, `Open ${app}`, { data: spec.data ?? '//', scheme: spec.scheme, package: spec.pkg, fallbackUrl: spec.web });
  const web = (id: string, app: string, url: string, pkg: string) => httpsIntent(id, app, `Open ${app}`, url, pkg);
  return [
    open('spotify.now', 'Spotify', { scheme: 'spotify', pkg: 'com.spotify.music', web: 'https://open.spotify.com/' }),
    web('youtube.open', 'YouTube', 'https://www.youtube.com/', 'com.google.android.youtube'),
    web('gmail.open', 'Gmail', 'https://mail.google.com/mail/u/0/', 'com.google.android.gm'),
    web('maps.home', 'Google Maps', 'https://www.google.com/maps', 'com.google.android.apps.maps'),
    web('gcal.open', 'Google Calendar', 'https://calendar.google.com/calendar/', 'com.google.android.calendar'),
    web('drive.open', 'Google Drive', 'https://drive.google.com/drive/my-drive', 'com.google.android.apps.docs'),
    web('keep.open', 'Google Keep', 'https://keep.google.com/', 'com.google.android.keep'),
    web('tasks.open', 'Google Tasks', 'https://tasks.google.com/', 'com.google.android.apps.tasks'),
    web('photos.open', 'Google Photos', 'https://photos.google.com/', 'com.google.android.apps.photos'),
    web('meet.new', 'Google Meet', 'https://meet.google.com/new', 'com.google.android.apps.tachyon'),
    web('notion.open', 'Notion', 'https://www.notion.so/', 'notion.id'),
    web('linkedin.open', 'LinkedIn', 'https://www.linkedin.com/feed/', 'com.linkedin.android'),
    web('x.open', 'X', 'https://x.com/home', 'com.twitter.android'),
    web('instagram.open', 'Instagram', 'https://www.instagram.com/', 'com.instagram.android'),
    web('facebook.open', 'Facebook', 'https://www.facebook.com/', 'com.facebook.katana'),
    web('slack.open', 'Slack', 'https://app.slack.com/', 'com.Slack'),
    web('discord.open', 'Discord', 'https://discord.com/channels/@me', 'com.discord'),
    web('teams.open', 'Teams', 'https://teams.microsoft.com/', 'com.microsoft.teams'),
    web('outlook.open', 'Outlook', 'https://outlook.live.com/mail/', 'com.microsoft.office.outlook'),
    web('dropbox.open', 'Dropbox', 'https://www.dropbox.com/home', 'com.dropbox.android'),
    web('onedrive.open', 'OneDrive', 'https://onedrive.live.com/', 'com.microsoft.skydrive'),
    web('todoist.open', 'Todoist', 'https://todoist.com/app', 'com.todoist'),
    web('trello.open', 'Trello', 'https://trello.com/', 'com.trello'),
    web('pocket.open', 'Pocket', 'https://getpocket.com/', 'com.ideashower.readitlater.pro'),
    web('chrome.open0', 'Chrome', 'https://www.google.com/', 'com.android.chrome'),
    // Payment apps: open only. No amounts, payees or payment parameters are ever built here.
    open('phonepe.open', 'PhonePe', { scheme: 'phonepe', pkg: 'com.phonepe.app', web: 'https://www.phonepe.com/' }),
    open('gpay.open', 'Google Pay', { scheme: 'tez', pkg: 'com.google.android.apps.nbu.paisa.user', web: 'https://pay.google.com/' }),
  ];
}

/** Drive helpers: open a file id, or the "Save to Drive" web flow (no silent upload is possible). */
export function driveFileUrl(id: string): string | null {
  return /^[\w-]{10,}$/.test(id) ? `https://drive.google.com/open?id=${id}` : null;
}
