"use client";

import { useEffect, useState } from "react";
import type { DashboardSnapshot } from "@brilhio/contracts";
import { apiFetch } from "../../lib/api-client";
import { ProductShell } from "../ui/product-shell";

export default function ContentPage() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/api/me/dashboard")
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error("Content failed to load.");
        return json.data as DashboardSnapshot;
      })
      .then((snapshot) => {
        if (active) setData(snapshot);
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProductShell activePath="/content">
      <div className="page-header">
        <div>
          <p className="brilhio-eyebrow">Content</p>
          <h1>Library</h1>
          <p>Real content items and media assets from the API.</p>
        </div>
      </div>

      {error ? <p className="demo-status demo-status-warn">{error}</p> : null}
      {!data && !error ? <p className="demo-status demo-status-ok">Loading content...</p> : null}

      {data ? (
        <div className="accounts-layout">
          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Drafts and campaigns</p>
                <h2>Content items</h2>
              </div>
            </div>
            <div className="stack-list">
              {data.contentItems.map((item) => (
                <article key={item.id} className="list-row list-row-stack">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.brief}</p>
                  </div>
                  <span className="state-badge status-info">{item.campaign}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Assets</p>
                <h2>Media</h2>
              </div>
            </div>
            <div className="stack-list">
              {data.mediaAssets.map((asset) => (
                <article key={asset.id} className="list-row list-row-stack">
                  <div>
                    <strong>{asset.title}</strong>
                    <p>{asset.storagePath}</p>
                  </div>
                  <span className="state-badge status-info">{asset.kind}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </ProductShell>
  );
}
