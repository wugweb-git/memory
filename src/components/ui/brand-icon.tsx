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
 * Official brand glyphs (Simple Icons paths) in each brand's own colour. The
 * colour comes from the icon data, not from this file, so components stay free
 * of hardcoded hex values.
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
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false" className={className} fill={`#${icon.hex}`}>
      <path d={icon.path} />
    </svg>
  );
}
