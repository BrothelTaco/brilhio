"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

type Profile = {
  brandType: BrandType | null;
  primaryGoal: PrimaryGoal | null;
  postingFrequency: PostingFrequency | null;
};

async function saveProfile(profile: Profile) {
  const res = await apiFetch("/api/me/strategy-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Save failed");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<Profile>({
    brandType: null,
    primaryGoal: null,
    postingFrequency: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function goToStep2() {
    if (!profile.brandType) return;
    setError("");
    setSaving(true);
    try {
      await saveProfile(profile);
      setStep(2);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function goToStep3() {
    if (!profile.primaryGoal) return;
    setError("");
    setSaving(true);
    try {
      await saveProfile(profile);
      setStep(3);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!profile.postingFrequency) return;
    setError("");
    setSaving(true);
    try {
      await saveProfile(profile);
      await apiFetch("/api/me/strategy-profile/finalize", { method: "POST" });
      router.push("/schedule");
    } catch {
      setError("Could not complete setup. Please try again.");
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="brilhio-shell onboarding-wizard">

        <header className="onboarding-header">
          <div>
            <p className="brilhio-eyebrow">
              Step {step} of 3 — {step === 1 ? "Brand type" : step === 2 ? "Primary goal" : "Posting frequency"}
            </p>
            <h1>
              {step === 1 && "What kind of account is this?"}
              {step === 2 && "What do you want social media to do for you?"}
              {step === 3 && "How often do you want to post?"}
            </h1>
            <p>
              {step === 1 && "This is the most important signal we use. It determines content formats, platform fit, tone, and what a conversion looks like for your brand."}
              {step === 2 && "Pick one. This shapes how the AI frames every post — the hook, the CTA, the tone. You can change it any time in the Media Strategy tab."}
              {step === 3 && "This controls how many slots the calendar generates each week. You can change it any time in the Media Strategy tab."}
            </p>
          </div>

          <div className="onboarding-step-indicators">
            {([1, 2, 3] as const).map((n) => (
              <span
                key={n}
                className={`step-dot ${n === step ? "step-dot-active" : n < step ? "step-dot-done" : ""}`}
              />
            ))}
          </div>
        </header>

        {error ? <p className="demo-status demo-status-warn">{error}</p> : null}

        {step === 1 && (
          <div className="onboarding-step">
            <div className="chip-row chip-row-lg">
              {BRAND_TYPES.map((type) => (
                <button
                  key={type}
                  className={`capability-chip capability-chip-lg ${profile.brandType === type ? "capability-chip-selected" : ""}`}
                  aria-pressed={profile.brandType === type}
                  onClick={() => setProfile({ ...profile, brandType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button
                className="brilhio-button brilhio-button-primary"
                onClick={goToStep2}
                disabled={!profile.brandType || saving}
              >
                {saving ? "Saving…" : "Next"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <div className="goal-card-grid">
              {PRIMARY_GOALS.map((goal) => (
                <button
                  key={goal.value}
                  className={`goal-card ${profile.primaryGoal === goal.value ? "goal-card-selected" : ""}`}
                  aria-pressed={profile.primaryGoal === goal.value}
                  onClick={() => setProfile({ ...profile, primaryGoal: goal.value })}
                >
                  <strong>{goal.label}</strong>
                  <p>{goal.description}</p>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button
                className="brilhio-button brilhio-button-secondary"
                onClick={() => setStep(1)}
                disabled={saving}
              >
                Back
              </button>
              <button
                className="brilhio-button brilhio-button-primary"
                onClick={goToStep3}
                disabled={!profile.primaryGoal || saving}
              >
                {saving ? "Saving…" : "Next"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <div className="frequency-card-grid">
              {POSTING_FREQUENCIES.map((freq) => (
                <button
                  key={freq.value}
                  className={`frequency-card ${profile.postingFrequency === freq.value ? "frequency-card-selected" : ""}`}
                  aria-pressed={profile.postingFrequency === freq.value}
                  onClick={() => setProfile({ ...profile, postingFrequency: freq.value })}
                >
                  <strong>{freq.label}</strong>
                  <span className="frequency-detail">{freq.detail}</span>
                  <p>{freq.note}</p>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button
                className="brilhio-button brilhio-button-secondary"
                onClick={() => setStep(2)}
                disabled={saving}
              >
                Back
              </button>
              <button
                className="brilhio-button brilhio-button-primary"
                onClick={finish}
                disabled={!profile.postingFrequency || saving}
              >
                {saving ? "Setting up…" : "Finish setup"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
