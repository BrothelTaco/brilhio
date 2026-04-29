"use client";

import { useEffect, useState } from "react";
import type { DashboardSnapshot } from "@brilhio/contracts";
import { apiFetch } from "../../lib/api-client";
import { ProductShell } from "../ui/product-shell";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: DashboardSnapshot }
  | { phase: "error"; message: string };

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    apiFetch("/api/me/dashboard")
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Dashboard failed to load.");
        }
        return json.data as DashboardSnapshot;
      })
      .then((data) => {
        if (active) setState({ phase: "ready", data });
      })
      .catch((error) => {
        if (active) setState({ phase: "error", message: error.message });
      });
    return () => {
      active = false;
    };
  }, []);

  const data = state.phase === "ready" ? state.data : null;
  const scheduled = data?.scheduledPosts.filter((post) => post.status === "scheduled").length ?? 0;
  const attention = data?.socialAccounts.filter((account) => account.status !== "connected").length ?? 0;
  const approvals = data?.approvalTasks.filter((task) => task.status === "pending").length ?? 0;
  const suggestions = data?.aiSuggestions.length ?? 0;

  return (
    <ProductShell activePath="/dashboard">
      <div className="page-header">
        <div>
          <p className="brilhio-eyebrow">Dashboard</p>
          <h1>Workspace health</h1>
          <p>Live counts from the API for content, scheduling, approvals, and AI guidance.</p>
        </div>
      </div>

      {state.phase === "loading" ? (
        <p className="demo-status demo-status-ok">Loading dashboard...</p>
      ) : null}

      {state.phase === "error" ? (
        <p className="demo-status demo-status-warn">{state.message}</p>
      ) : null}

      <section className="overview-grid">
        <article className="brilhio-card overview-card">
          <span>Scheduled</span>
          <strong>{scheduled}</strong>
        </article>
        <article className="brilhio-card overview-card">
          <span>Needs attention</span>
          <strong>{attention}</strong>
        </article>
        <article className="brilhio-card overview-card">
          <span>Pending approvals</span>
          <strong>{approvals}</strong>
        </article>
        <article className="brilhio-card overview-card">
          <span>AI suggestions</span>
          <strong>{suggestions}</strong>
        </article>
      </section>

      {data ? (
        <div className="accounts-layout">
          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Content pipeline</p>
                <h2>Recent content</h2>
              </div>
            </div>
            <div className="stack-list">
              {data.contentItems.slice(0, 6).map((item) => (
                <article key={item.id} className="list-row list-row-stack">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.primaryCaption}</p>
                  </div>
                  <span className="state-badge status-info">{item.stage}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Queue</p>
                <h2>Recent jobs</h2>
              </div>
            </div>
            <div className="stack-list">
              {data.jobs.slice(0, 6).map((job) => (
                <article key={job.id} className="list-row list-row-stack">
                  <div>
                    <strong>{job.type}</strong>
                    <p>{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="state-badge status-info">{job.status}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </ProductShell>
  );
}
