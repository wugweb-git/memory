import { redirect } from 'next/navigation';
import { IDENTITY_CONFIG } from '@/config/identity';

// The root of the mapped domain points at the owner's public profile.
// The private app lives at /console.
export default function RootRedirect() {
  redirect(`/p/${IDENTITY_CONFIG.HANDLE}`);
}
