"use client";

import { useParams } from 'next/navigation';
import { PublicProfileView } from './PublicProfileView';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-accent/20">
      <PublicProfileView username={username} />
    </div>
  );
}
