"use client";

import { useParams } from 'next/navigation';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PublicProfileView } from './PublicProfileView';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col selection:bg-accent/30">
      <ToastContainer position="bottom-right" theme="light" />
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="absolute top-[10%] left-[5%] w-[60vw] h-[60vh] bg-accent/5 rounded-full blur-[150px] animate-pulse" />
      </div>
      <PublicProfileView username={username} />
    </div>
  );
}
