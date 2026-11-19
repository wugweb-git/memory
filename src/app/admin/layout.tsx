import type { Metadata } from 'next';
import { AppShell } from '@/app/component/AppShell';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Identity Prism' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
