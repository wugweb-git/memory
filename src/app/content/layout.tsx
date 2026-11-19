import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Content' };

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
