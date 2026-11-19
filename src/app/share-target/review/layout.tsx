import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Review shared content' };

export default function ShareReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
