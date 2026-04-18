import Link from "next/link";
import { ProductShell } from "../ui/product-shell";
import {
  accountProviders,
  automationGuardrails,
  connectionChecklist,
} from "../ui/scaffold-data";

export default function AccountsPage() {
  return (
    <ProductShell
      activePath="/accounts"
      eyebrow="Account linking"
      title="Provider control center"
      description="A dedicated desktop page for reviewing channel readiness, permission scope, and the operational guardrails that should exist before live posting is wired."
      actions={
        <>
          <Link href="/account" className="ritmio-button ritmio-button-secondary">
            Open account profile
          </Link>
          <Link href="/dashboard" className="ritmio-button ritmio-button-secondary">
            Back to dashboard
          </Link>
          <a href="#provider-grid" className="ritmio-button ritmio-button-primary">
            Review providers
          </a>
        </>
      }
    >
      <section className="ritmio-card surface-card account-hero">
        <div>
          <p className="ritmio-eyebrow">Desktop setup flow</p>
          <h2>Link the right accounts before you automate the schedule.</h2>
        </div>
        <p>
          This scaffold separates connection management from the weekly board so
          operators can inspect permissions, supported media, and sync rules
          without cluttering the scheduling view.
        </p>
      </section>

      <div className="accounts-layout">
        <section id="provider-grid" className="provider-grid">
          {accountProviders.map((provider) => (
            <article key={provider.name} className="ritmio-card provider-card">
              <div className="provider-head">
                <div>
                  <p className="ritmio-eyebrow">{provider.name}</p>
                  <h2>{provider.status}</h2>
                </div>
                <span className={`state-badge ${provider.toneClass}`}>
                  {provider.name}
                </span>
              </div>

              <p className="provider-copy">{provider.description}</p>

              <div className="provider-section">
                <span>Permissions to stage</span>
                <div className="chip-row">
                  {provider.permissions.map((permission) => (
                    <span key={permission} className="capability-chip">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="provider-section">
                <span>Formats expected</span>
                <div className="chip-row">
                  {provider.formats.map((format) => (
                    <span key={format} className="capability-chip capability-chip-alt">
                      {format}
                    </span>
                  ))}
                </div>
              </div>

              <div className="provider-sync-bar">
                <strong>Sync rule</strong>
                <p>{provider.sync}</p>
              </div>

              <a href="#provider-grid" className="ritmio-button ritmio-button-secondary">
                Configure {provider.name}
              </a>
            </article>
          ))}
        </section>

        <div className="rail-layout">
          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Connection checklist</p>
                <h2>Before live activation</h2>
              </div>
            </div>

            <div className="stack-list">
              {connectionChecklist.map((item) => (
                <article key={item} className="bullet-row">
                  <span className="bullet-dot" />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Automation guardrails</p>
                <h2>Policy before publish</h2>
              </div>
            </div>

            <div className="stack-list">
              {automationGuardrails.map((item) => (
                <article key={item.title} className="insight-card">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Why this page exists</p>
                <h2>Separate setup from planning</h2>
              </div>
            </div>

            <p className="surface-copy">
              The dashboard should stay focused on the week. Account linking
              needs its own slower, more operational screen where status,
              permissions, retry rules, and content constraints can be reviewed
              without interrupting the planner.
            </p>
          </section>
        </div>
      </div>
    </ProductShell>
  );
}
