'use client';

import { ErrorPanel } from './_components/ErrorPanel';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel digest={error.digest} reset={reset} />;
}
