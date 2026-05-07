"use client";

import { useEffect, useState } from "react";
import { ProductShell } from "../ui/product-shell";
import { apiFetch } from "../../lib/api-client";

const BRAND_TYPES = [
  "Musician",
  "Band / Group",
  "Restaurant",
  "Café / Coffee shop",
  "Bar / Venue",
  "Retail shop",
  "Fitness creator",
  "Visual artist",
  "Photographer",
  "Software / Tech",
  "Content creator",
  "Other",
] as const;

const PRIMARY_GOALS = [
  {
    value: "grow_audience",
    label: "Grow my audience",
    description: "The AI optimizes for reach and follows — content is crafted to attract new people, not just speak to existing ones.",
  },
  {
    value: "drive_action",
    label: "Drive a specific action",
    description: "The AI works CTAs and promotional cadence into every post — tuned for sales, bookings, streams, or tickets depending on your brand type.",
  },
  {
    value: "build_community",
    label: "Build community",
    description: "The AI prioritizes engagement hooks and replies over broadcast — content invites conversation and keeps existing followers active.",
  },
] as const;

const POSTING_FREQUENCIES = [
  {
    value: "low",
    label: "Low",
    detail: "3–4 posts per week",
    note: "Good for brands that want quality over quantity or have limited content.",
  },
  {
    value: "regular",
    label: "Regular",
    detail: "5–7 posts per week",
    note: "The most common cadence. Consistent without being overwhelming.",
  },
  {
    value: "active",
    label: "Active",
    detail: "10–14 posts per week",
    note: "For brands building momentum fast or running a campaign.",
  },
  {
    value: "ai_recommended",
    label: "Let AI decide",
    detail: "Recommended based on your brand type and goal",
    note: "Brilhio picks a starting cadence and adjusts as it learns what works.",
  },
] as const;

type BrandType = (typeof BRAND_TYPES)[number];
type PrimaryGoal = (typeof PRIMARY_GOALS)[number]["value"];
type PostingFrequency = (typeof POSTING_FREQUENCIES)[number]["value"];

type StrategyProfile = {
  brandType: BrandType | null;
  primaryGoal: PrimaryGoal | null;
  postingFrequency: PostingFrequency | null;
  brandBrief: string | null;
  brandBriefGeneratedAt: string | null;
};

export default function StrategyPage() {
  const [profile, setProfile] = useState<StrategyProfile>({
    brandType: null,
    primaryGoal: null,
    postingFrequency: null,
    brandBrief: null,
    brandBriefGeneratedAt: null,
  });
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    let active = true;
    apiFetch("/api/me/strategy-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.data) {
          setProfile({
            brandType: json.data.brandType ?? null,
            primaryGoal: json.data.primaryGoal ?? null,
            postingFrequency: json.data.postingFrequency ?? null,
            brandBrief: json.data.brandBrief ?? null,
            brandBriefGeneratedAt: json.data.brandBriefGeneratedAt ?? null,
          });
        }
        setLoadStatus("ready");
      })
      .catch(() => {
        if (active) setLoadStatus("error");
      });
    return () => { active = false; };
  }, []);

  async function save(next: StrategyProfile) {
    setSaveStatus("saving");
    try {
      const res = await apiFetch("/api/me/strategy-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandType: next.brandType,
          primaryGoal: next.primaryGoal,
          postingFrequency: next.postingFrequency,
        }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 2200);
  }

  function update(next: StrategyProfile) {
    setProfile(next);
    void save(next);
  }

  const saveBadge =
    saveStatus === "saving" ? <span className="state-badge status-info">Saving…</span>
    : saveStatus === "saved" ? <span className="state-badge status-ok">Saved</span>
    : saveStatus === "error" ? <span className="state-badge status-warn">Error saving</span>
    : null;

  return (
    <ProductShell activePath="/strategy">
      <div className="surface-head page-heading">
        <div>
          <p className="brilhio-eyebrow">Media Strategy</p>
          <h1>Strategy settings</h1>
          <p className="surface-body-text">
            These three settings drive all AI recommendations, caption voice, and how many calendar slots are generated each week. Changes take effect on the next calendar build.
          </p>
        </div>
        {loadStatus === "loading"
          ? <span className="state-badge status-info">Loading…</span>
          : saveBadge}
      </div>

      <div className="strategy-layout">

        <section className="brilhio-card surface-card">
          <div className="surface-head">
            <div>
              <p className="brilhio-eyebrow">Brand type</p>
              <h2>What kind of account is this?</h2>
            </div>
          </div>
          <p className="surface-body-text">
            The single most important input. Determines content formats, platform fit, and what a conversion looks like for your brand.
          </p>
          <div className="chip-row chip-row-lg">
            {BRAND_TYPES.map((type) => (
              <button
                key={type}
                className={`capability-chip capability-chip-lg ${profile.brandType === type ? "capability-chip-selected" : ""}`}
                aria-pressed={profile.brandType === type}
                onClick={() => update({ ...profile, brandType: type })}
                disabled={loadStatus === "loading"}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        <section className="brilhio-card surface-card">
          <div className="surface-head">
            <div>
              <p className="brilhio-eyebrow">Primary goal</p>
              <h2>What do you want social media to do?</h2>
            </div>
          </div>
          <p className="surface-body-text">
            One goal keeps the AI focused. Every post is shaped around this outcome.
          </p>
          <div className="goal-card-grid">
            {PRIMARY_GOALS.map((goal) => (
              <button
                key={goal.value}
                className={`goal-card ${profile.primaryGoal === goal.value ? "goal-card-selected" : ""}`}
                aria-pressed={profile.primaryGoal === goal.value}
                onClick={() => update({ ...profile, primaryGoal: goal.value })}
                disabled={loadStatus === "loading"}
              >
                <strong>{goal.label}</strong>
                <p>{goal.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="brilhio-card surface-card">
          <div className="surface-head">
            <div>
              <p className="brilhio-eyebrow">Posting frequency</p>
              <h2>How often should Brilhio fill the calendar?</h2>
            </div>
          </div>
          <p className="surface-body-text">
            Controls how many slots are generated each week. Consistency matters more than volume — pick what you can actually sustain.
          </p>
          <div className="frequency-card-grid">
            {POSTING_FREQUENCIES.map((freq) => (
              <button
                key={freq.value}
                className={`frequency-card ${profile.postingFrequency === freq.value ? "frequency-card-selected" : ""}`}
                aria-pressed={profile.postingFrequency === freq.value}
                onClick={() => update({ ...profile, postingFrequency: freq.value })}
                disabled={loadStatus === "loading"}
              >
                <strong>{freq.label}</strong>
                <span className="frequency-detail">{freq.detail}</span>
                <p>{freq.note}</p>
              </button>
            ))}
          </div>
        </section>

        {profile.brandBrief ? (
          <section className="brilhio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="brilhio-eyebrow">Brand brief</p>
                <h2>AI-generated summary</h2>
              </div>
              {profile.brandBriefGeneratedAt ? (
                <span className="state-badge status-info">
                  Generated {new Date(profile.brandBriefGeneratedAt).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            <p className="surface-body-text">
              Used as context for all AI jobs. Regenerated automatically when you save changes here.
            </p>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: "1.6" }}>
              {profile.brandBrief}
            </p>
          </section>
        ) : loadStatus === "ready" ? (
          <section className="brilhio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="brilhio-eyebrow">Brand brief</p>
                <h2>AI-generated summary</h2>
              </div>
            </div>
            <p className="surface-body-text">
              Your brand brief will appear here once the AI has processed your strategy profile. This usually completes within a few seconds of finishing onboarding.
            </p>
          </section>
        ) : null}

      </div>
    </ProductShell>
  );
}
