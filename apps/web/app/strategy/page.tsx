"use client";

import { useEffect, useRef, useState } from "react";
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
  brandDescription: string | null;
  audienceDescription: string | null;
  primaryGoal: PrimaryGoal | null;
  postingFrequency: PostingFrequency | null;
  brandBrief: string | null;
  brandBriefGeneratedAt: string | null;
};

export default function StrategyPage() {
  const [profile, setProfile] = useState<StrategyProfile>({
    brandType: null,
    brandDescription: null,
    audienceDescription: null,
    primaryGoal: null,
    postingFrequency: null,
    brandBrief: null,
    brandBriefGeneratedAt: null,
  });
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [briefEditMode, setBriefEditMode] = useState(false);
  const [briefDraft, setBriefDraft] = useState("");
  const [briefSaving, setBriefSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<StrategyProfile | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/me/strategy-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.data) {
          setProfile({
            brandType: json.data.brandType ?? null,
            brandDescription: json.data.brandDescription ?? null,
            audienceDescription: json.data.audienceDescription ?? null,
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

  async function flushSave(next: StrategyProfile) {
    setSaveStatus("saving");
    try {
      const res = await apiFetch("/api/me/strategy-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandType: next.brandType,
          primaryGoal: next.primaryGoal,
          postingFrequency: next.postingFrequency,
          brandDescription: next.brandDescription ?? null,
          audienceDescription: next.audienceDescription ?? null,
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
    pendingRef.current = next;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (pendingRef.current) void flushSave(pendingRef.current);
    }, 600);
  }

  function updateImmediate(next: StrategyProfile) {
    setProfile(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave(next);
  }

  async function saveBriefEdit() {
    setBriefSaving(true);
    try {
      const res = await apiFetch("/api/me/strategy-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandType: profile.brandType,
          primaryGoal: profile.primaryGoal,
          postingFrequency: profile.postingFrequency,
          brandDescription: profile.brandDescription ?? null,
          audienceDescription: profile.audienceDescription ?? null,
          brandBrief: briefDraft,
        }),
      });
      if (res.ok) {
        setProfile((p) => ({ ...p, brandBrief: briefDraft }));
        setBriefEditMode(false);
      }
    } finally {
      setBriefSaving(false);
    }
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
            These settings drive all AI recommendations, caption voice, and how many calendar slots are generated each week. Changes take effect on the next calendar build.
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
                onClick={() => updateImmediate({ ...profile, brandType: type })}
                disabled={loadStatus === "loading"}
              >
                {type}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <label className="brilhio-eyebrow" style={{ display: "block", marginBottom: "0.5rem" }}>
              Describe your brand and vibe
            </label>
            <textarea
              className="strategy-textarea"
              placeholder="e.g. Warm, nostalgic Saturday-night-out energy. We're a 70s cover band that makes 45–65 year olds feel like it's 1978 again."
              rows={3}
              disabled={loadStatus === "loading"}
              value={profile.brandDescription ?? ""}
              onChange={(e) => update({ ...profile, brandDescription: e.target.value || null })}
            />
          </div>
        </section>

        <section className="brilhio-card surface-card">
          <div className="surface-head">
            <div>
              <p className="brilhio-eyebrow">Audience</p>
              <h2>Who are you trying to reach?</h2>
            </div>
          </div>
          <p className="surface-body-text">
            Describe the ideal person who discovers you. Their age, interests, lifestyle, and when they're online shapes when and how the AI schedules your posts.
          </p>
          <textarea
            className="strategy-textarea"
            placeholder="e.g. People 45–65 who grew up with classic rock, go out Thursday–Saturday nights, and are active on Facebook. They're planning a night out, not scrolling late."
            rows={3}
            disabled={loadStatus === "loading"}
            value={profile.audienceDescription ?? ""}
            onChange={(e) => update({ ...profile, audienceDescription: e.target.value || null })}
          />
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
                onClick={() => updateImmediate({ ...profile, primaryGoal: goal.value })}
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
                onClick={() => updateImmediate({ ...profile, postingFrequency: freq.value })}
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {profile.brandBriefGeneratedAt ? (
                  <span className="state-badge status-info">
                    Generated {new Date(profile.brandBriefGeneratedAt).toLocaleDateString()}
                  </span>
                ) : null}
                {!briefEditMode && (
                  <button
                    className="capability-chip"
                    onClick={() => { setBriefDraft(profile.brandBrief ?? ""); setBriefEditMode(true); }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <p className="surface-body-text">
              Used as context for all AI jobs. Edit it to correct any misreads — your edits become the source of truth.
            </p>
            {briefEditMode ? (
              <>
                <textarea
                  className="strategy-textarea"
                  rows={6}
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  style={{ marginBottom: "0.75rem" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="capability-chip capability-chip-selected"
                    onClick={saveBriefEdit}
                    disabled={briefSaving}
                  >
                    {briefSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    className="capability-chip"
                    onClick={() => setBriefEditMode(false)}
                    disabled={briefSaving}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: "1.6" }}>
                {profile.brandBrief}
              </p>
            )}
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
