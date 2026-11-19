import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Memory admin', template: '%s | Identity Prism' },
};

export default function AdminMemoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
