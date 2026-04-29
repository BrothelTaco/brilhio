"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api-client";
import {
  identityTypes,
  onboardingPreview,
  onboardingSteps,
  platformPriorities,
  presenceGoals,
  voiceAttributes,
} from "../ui/scaffold-data";

type StrategyProfile = {
  identityType: string | null;
  goals: string[];
  voiceAttributes: string[];
  platformPriorities: Record<string, string>;
  contentPillars: string[];
  audienceNotes: string | null;
};

const DEFAULT_PROFILE: StrategyProfile = {
  identityType: "Band",
  goals: ["Grow fandom", "Sell tickets"],
  voiceAttributes: ["Warm", "Direct", "A little witty"],
  platformPriorities: Object.fromEntries(
    platformPriorities.map((item) => [item.platform, item.priority]),
  ),
  contentPillars: [],
  audienceNotes: "",
};

function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function OnboardingPage() {
  const [profile, setProfile] = useState<StrategyProfile>(DEFAULT_PROFILE);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let active = true;
    apiFetch("/api/me/strategy-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.data) {
          setProfile({
            identityType: json.data.identityType ?? DEFAULT_PROFILE.identityType,
            goals: json.data.goals.length ? json.data.goals : DEFAULT_PROFILE.goals,
            voiceAttributes: json.data.voiceAttributes.length
              ? json.data.voiceAttributes
              : DEFAULT_PROFILE.voiceAttributes,
            platformPriorities: Object.keys(json.data.platformPriorities).length
              ? json.data.platformPriorities
              : DEFAULT_PROFILE.platformPriorities,
            contentPillars: json.data.contentPillars ?? [],
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

  async function save(nextProfile = profile) {
    setStatus("saving");
    try {
      const response = await apiFetch("/api/me/strategy-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2200);
  }

  function update(nextProfile: StrategyProfile) {
    setProfile(nextProfile);
    void save(nextProfile);
  }

  return (
    <main className="workspace-page">
      <div className="brilhio-shell onboarding-page">
        <header className="onboarding-header">
          <div>
            <p className="brilhio-eyebrow">First-time login</p>
            <h1>Set the strategy before the calendar fills up.</h1>
            <p>
              These choices are saved to your Supabase profile and used by the
              account profile, calendar recommendations, and AI jobs.
            </p>
          </div>
          <div className="page-actions">
            {status !== "idle" ? <span className="state-badge status-info">{status}</span> : null}
            <Link href="/account" className="brilhio-button brilhio-button-secondary">
              Account profile
            </Link>
            <Link href="/dashboard" className="brilhio-button brilhio-button-primary">
              Continue
            </Link>
          </div>
        </header>

        <div className="onboarding-layout">
          <section className="brilhio-card surface-card onboarding-steps">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Flow outline</p>
                <h2>What first-time setup covers</h2>
              </div>
            </div>

            <div className="stack-list">
              {onboardingSteps.map((step) => (
                <article key={step.title} className="step-card">
                  <span className="workflow-index">{step.step}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="rail-layout">
            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Identity selection</p>
                  <h2>Who are you?</h2>
                </div>
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
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Goals</p>
                  <h2>What is social for?</h2>
                </div>
              </div>

              <div className="chip-row">
                {presenceGoals.map((goal) => (
                  <button
                    key={goal}
                    className={`capability-chip ${
                      profile.goals.includes(goal) ? "capability-chip-selected" : ""
                    }`}
                    onClick={() => update({ ...profile, goals: toggle(profile.goals, goal) })}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </section>

            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Voice</p>
                  <h2>How should Brilhio write?</h2>
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
                        voiceAttributes: toggle(profile.voiceAttributes, attribute),
                      })
                    }
                  >
                    {attribute}
                  </button>
                ))}
              </div>
            </section>

            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Audience notes</p>
                  <h2>What should the AI remember?</h2>
                </div>
              </div>
              <label className="field-stack">
                <span>Notes</span>
                <textarea
                  value={profile.audienceNotes ?? ""}
                  onChange={(event) =>
                    setProfile({ ...profile, audienceNotes: event.target.value })
                  }
                  onBlur={() => save()}
                  rows={4}
                  placeholder="Audience, offers, recurring events, words to avoid..."
                />
              </label>
            </section>

            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Starter recommendations</p>
                  <h2>Generated from setup</h2>
                </div>
              </div>

              <div className="stack-list">
                {onboardingPreview.map((item) => (
                  <article key={item.title} className="insight-card">
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
