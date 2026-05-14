'use client';

import { useState } from "react";
import { M3Card, M3Page } from "@/components/ui/m3";

export default function PortfolioPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState<any>(null);

  async function saveReference() {
    const payload = { title, url, source: "manual" };
    setSaved(payload);
  }

  return (
    <M3Page title="Portfolio CMS" subtitle="Projects, case studies, external references">
      <M3Card title="External Reference">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border p-3 text-sm" placeholder="Title" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-2xl border p-3 text-sm" placeholder="URL" />
        <button onClick={saveReference} className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold uppercase">Save</button>
        {saved ? <pre className="text-xs">{JSON.stringify(saved, null, 2)}</pre> : null}
      </M3Card>
    </M3Page>
  );
}
