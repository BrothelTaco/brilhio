"use client";

import { useState } from "react";
import { ProductShell } from "../ui/product-shell";
import { useTheme } from "../ui/theme-provider";
import {
  audienceSignals,
  contentPillars,
  futureIdeas,
  identityTypes,
  platformPriorities,
  presenceGoals,
  recommendationInputs,
  voiceAttributes,
} from "../ui/scaffold-data";

const DEMO_WORKSPACE_ID = "demo-workspace";
const DEMO_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getIanaTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Australia/Sydney",
    ];
  }
}

function TimezoneSelector({ workspaceId }: { workspaceId: string }) {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timezones = getIanaTimezones();

  async function handleChange(next: string) {
    setTimezone(next);
    setStatus("saving");
    try {
      const res = await fetch(
        `${DEMO_API_BASE}/workspaces/${workspaceId}/timezone`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: next }),
        },
      );
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <section className="brilhio-card surface-card">
      <div className="surface-head compact-head">
        <div>
          <p className="brilhio-eyebrow">Scheduling</p>
          <h2>Timezone</h2>
        </div>
        {status === "saving" && <span className="state-badge status-info">Saving…</span>}
        {status === "saved" && <span className="state-badge status-ok">Saved</span>}
        {status === "error" && <span className="state-badge status-warn">Error</span>}
      </div>
      <p className="surface-body-text">
        All scheduled posts use this timezone. Posts you schedule at "3 PM" will publish at 3 PM in this zone.
      </p>
      <label className="field-stack">
        <span>Workspace timezone</span>
        <select
          value={timezone}
          onChange={(e) => handleChange(e.target.value)}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

export default function AccountPage() {
  const { theme, setTheme } = useTheme();

  return (
    <ProductShell activePath="/account">

      <section className="overview-grid">
        {audienceSignals.map((signal) => (
          <article key={signal.title} className="brilhio-card overview-card">
            <span>{signal.title}</span>
            <strong>{signal.value}</strong>
          </article>
        ))}
      </section>

      <div className="accounts-layout">
        <section className="stack-list">
          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Identity</p>
                <h2>What kind of presence is this?</h2>
              </div>
            </div>

            <div className="chip-row">
              {identityTypes.map((type) => (
                <span
                  key={type}
                  className={`capability-chip ${
                    type === "Band" ? "capability-chip-selected" : ""
                  }`}
                >
                  {type}
                </span>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Presence goals</p>
                <h2>What should social media actually do?</h2>
              </div>
            </div>

            <div className="chip-row">
              {presenceGoals.map((goal) => (
                <span
                  key={goal}
                  className={`capability-chip ${
                    goal === "Grow fandom" || goal === "Sell tickets"
                      ? "capability-chip-selected"
                      : ""
                  }`}
                >
                  {goal}
                </span>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Voice and behavior</p>
                <h2>How the brand should sound</h2>
              </div>
            </div>

            <div className="chip-row">
              {voiceAttributes.map((attribute) => (
                <span key={attribute} className="capability-chip capability-chip-alt">
                  {attribute}
                </span>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Content pillars</p>
                <h2>What the calendar should pull from</h2>
              </div>
            </div>

            <div className="stack-list">
              {contentPillars.map((pillar) => (
                <article key={pillar.title} className="insight-card">
                  <strong>{pillar.title}</strong>
                  <p>{pillar.body}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <div className="rail-layout">
          <section className="brilhio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="brilhio-eyebrow">Appearance</p>
                <h2>Theme</h2>
              </div>
            </div>

            <div className="theme-toggle-row">
              <button
                className={`theme-option ${theme === "dark" ? "theme-option-active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                Dark
              </button>
              <button
                className={`theme-option ${theme === "light" ? "theme-option-active" : ""}`}
                onClick={() => setTheme("light")}
              >
                Light
              </button>
            </div>
          </section>

          <TimezoneSelector workspaceId={DEMO_WORKSPACE_ID} />

          <section className="brilhio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="brilhio-eyebrow">Platform priorities</p>
                <h2>Where the best slots go first</h2>
              </div>
            </div>

            <div className="stack-list">
              {platformPriorities.map((item) => (
                <article key={item.platform} className="list-row list-row-stack">
                  <div>
                    <strong>{item.platform}</strong>
                    <p>{item.role}</p>
                  </div>
                  <span className="state-badge status-info">{item.priority}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="brilhio-eyebrow">Recommendation inputs</p>
                <h2>What timing logic should respect</h2>
              </div>
            </div>

            <div className="stack-list">
              {recommendationInputs.map((item) => (
                <article key={item.label} className="insight-card">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="brilhio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="brilhio-eyebrow">Future ideas</p>
                <h2>Worth building into the product</h2>
              </div>
            </div>

            <div className="stack-list">
              {futureIdeas.map((item) => (
                <article key={item.title} className="insight-card">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ProductShell>
  );
}
