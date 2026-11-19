import {
  siBehance,
  siDribbble,
  siGithub,
  siGooglecalendar,
  siGoogledrive,
  siGoogletasks,
  siLinkedin,
  siNotion,
  siRss,
  siX,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons';

/**
 * Official brand glyphs (Simple Icons paths) drawn in the current text colour,
 * so they follow the design tokens and never introduce a hardcoded hex.
 */
const BRAND_ICONS: Record<string, SimpleIcon> = {
  github: siGithub,
  youtube: siYoutube,
  blog: siRss,
  notion: siNotion,
  'google-drive': siGoogledrive,
  'google-calendar': siGooglecalendar,
  'google-calendar-events': siGooglecalendar,
  'google-tasks': siGoogletasks,
  linkedin: siLinkedin,
  twitter: siX,
  behance: siBehance,
  dribbble: siDribbble,
};

export function brandIconFor(id: string, custom?: boolean): SimpleIcon | null {
  if (custom) return siRss;
  return BRAND_ICONS[id] ?? null;
}

export function BrandIcon({ icon, className }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false" className={className} fill="currentColor">
      <path d={icon.path} />
    </svg>
  );
}
