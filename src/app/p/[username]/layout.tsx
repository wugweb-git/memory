import type { Metadata } from 'next';
import { getProfile } from '@/lib/profile/store';
import { isValidUsername, toPublicProfile } from '@/lib/profile/validate';
import { buildProfileMetadata } from './metadata';

/** Server-side metadata so link previews and crawlers see the profile, not an empty shell. */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return { title: 'Public profile' };
    const profile = await getProfile(username);
    const pub = profile ? toPublicProfile(profile) : null;
    return buildProfileMetadata(username, pub);
  } catch {
    return { title: 'Public profile' };
  }
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
