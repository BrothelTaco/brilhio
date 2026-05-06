"use client";

import { useEffect, useState } from "react";
import { ProductShell } from "../ui/product-shell";
import { apiFetch } from "../../lib/api-client";
import {
  audienceSignals,
  contentPillars,
  futureIdeas,
  identityTypes,
  industries,
  platformPriorities,
  presenceGoals,
  recommendationInputs,
  voiceAttributes,
} from "../ui/scaffold-data";

type StrategyProfile = {
  identityType: string | null;
  industry: string | null;
  goals: string[];
  voiceAttributes: string[];
  platformPriorities: Record<string, string>;
  contentPillars: string[];
  audienceNotes: string | null;
};

const DEFAULT_STRATEGY: StrategyProfile = {
  identityType: "Band",
  industry: null,
  goals: ["Grow fandom", "Sell tickets"],
  voiceAttributes: [...voiceAttributes],
  platformPriorities: Object.fromEntries(
    platformPriorities.map((item) => [item.platform, item.priority]),
  ),
  contentPillars: contentPillars.map((pillar) => pillar.title),
  audienceNotes: "",
};

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

function TimezoneSelector() {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timezones = getIanaTimezones();

  async function handleChange(next: string) {
    setTimezone(next);
    setStatus("saving");
    try {
      const res = await apiFetch("/api/me/timezone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: next }),
      });
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
        <span>Timezone</span>
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

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function StrategyProfilePanel() {
  const [profile, setProfile] = useState<StrategyProfile>(DEFAULT_STRATEGY);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let active = true;
    apiFetch("/api/me/strategy-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.data) {
          setProfile({
            identityType: json.data.identityType ?? DEFAULT_STRATEGY.identityType,
            industry: json.data.industry ?? DEFAULT_STRATEGY.industry,
            goals: json.data.goals.length ? json.data.goals : DEFAULT_STRATEGY.goals,
            voiceAttributes: json.data.voiceAttributes.length
              ? json.data.voiceAttributes
              : DEFAULT_STRATEGY.voiceAttributes,
            platformPriorities: Object.keys(json.data.platformPriorities).length
              ? json.data.platformPriorities
              : DEFAULT_STRATEGY.platformPriorities,
            contentPillars: json.data.contentPillars.length
              ? json.data.contentPillars
              : DEFAULT_STRATEGY.contentPillars,
            audienceNotes: json.data.audienceNotes ?? "",
          });
        }
        setStatus("idle");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(next = profile) {
    setStatus("saving");
    try {
      const response = await apiFetch("/api/me/strategy-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2200);
  }

  function update(next: StrategyProfile) {
    setProfile(next);
    void save(next);
  }

  return (
    <>
      <section className="brilhio-card surface-card">
        <div className="surface-head">
          <div>
            <p className="brilhio-eyebrow">Identity</p>
            <h2>What kind of presence is this?</h2>
          </div>
          {status !== "idle" && <span className="state-badge status-info">{status}</span>}
        </div>

        <div className="chip-row">
          {identityTypes.map((type) => (
            <button
              key={type}
              className={`capability-chip ${
                profile.identityType === type ? "capability-chip-selected" : ""
              }`}
              onClick={() => update({ ...profile, identityType: type })}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <section className="brilhio-card surface-card">
        <div className="surface-head">
          <div>
            <p className="brilhio-eyebrow">Industry</p>
            <h2>What field do you operate in?</h2>
          </div>
        </div>

        <div className="chip-row">
          {industries.map((industry) => (
            <button
              key={industry}
              className={`capability-chip ${
                profile.industry === industry ? "capability-chip-selected" : ""
              }`}
              onClick={() => update({ ...profile, industry })}
            >
              {industry}
            </button>
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
            <button
              key={goal}
              className={`capability-chip ${
                profile.goals.includes(goal) ? "capability-chip-selected" : ""
              }`}
              onClick={() => update({ ...profile, goals: toggleValue(profile.goals, goal) })}
            >
              {goal}
            </button>
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
            <button
              key={attribute}
              className={`capability-chip ${
                profile.voiceAttributes.includes(attribute)
                  ? "capability-chip-selected"
                  : "capability-chip-alt"
              }`}
              onClick={() =>
                update({
                  ...profile,
                  voiceAttributes: toggleValue(profile.voiceAttributes, attribute),
                })
              }
            >
              {attribute}
            </button>
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
              <button
                className={`brilhio-button ${
                  profile.contentPillars.includes(pillar.title)
                    ? "brilhio-button-primary"
                    : "brilhio-button-secondary"
                }`}
                onClick={() =>
                  update({
                    ...profile,
                    contentPillars: toggleValue(profile.contentPillars, pillar.title),
                  })
                }
              >
                {profile.contentPillars.includes(pillar.title) ? "Enabled" : "Enable"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function PrivacyPanel() {
  const [status, setStatus] = useState<"idle" | "exporting" | "deleting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function exportAccountData() {
    setStatus("exporting");
    setMessage("");
    try {
      const response = await apiFetch("/api/me/export");
      const json = await response.json();
      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Export failed.");
      }

      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `brilhio-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("done");
      setMessage("Account export generated.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Account export failed.");
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Delete this Brilhio account? Any linked Stripe subscription/customer will be cancelled first. This cannot be undone.",
    );
    if (!confirmed) return;

    setStatus("deleting");
    setMessage("");
    try {
      const response = await apiFetch("/api/me", { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Account deletion failed.");
      }
      window.location.assign("/sign-out");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Account deletion failed.");
    }
  }

  return (
    <section className="brilhio-card surface-card">
      <div className="surface-head compact-head">
        <div>
          <p className="brilhio-eyebrow">Privacy</p>
          <h2>Account data</h2>
        </div>
        {status !== "idle" ? <span className="state-badge status-info">{status}</span> : null}
      </div>

      <p className="surface-body-text">
        Export your account data or permanently delete the account. Deletion cancels linked Stripe billing before removing the Supabase user.
      </p>

      {message ? (
        <p className={`demo-status ${status === "error" ? "demo-status-warn" : "demo-status-ok"}`}>
          {message}
        </p>
      ) : null}

      <div className="inline-actions">
        <button
          className="brilhio-button brilhio-button-secondary"
          onClick={exportAccountData}
          disabled={status === "exporting" || status === "deleting"}
        >
          Export data
        </button>
        <button
          className="brilhio-button brilhio-button-secondary"
          onClick={deleteAccount}
          disabled={status === "exporting" || status === "deleting"}
        >
          Delete account
        </button>
      </div>
    </section>
  );
}

export default function AccountPage() {
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
          <StrategyProfilePanel />
        </section>

        <div className="rail-layout">
          <TimezoneSelector />

          <PrivacyPanel />

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
