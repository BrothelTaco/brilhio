"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authHighlights, onboardingPreview } from "./ui/scaffold-data";
import { createClient } from "../lib/supabase/client";

export default function AuthEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showAuthRequiredMessage = searchParams.get("reason") === "auth-required";
  const showSignedOutMessage = searchParams.get("signedOut") === "1";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/schedule");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="brilhio-shell auth-grid">
        <div className="auth-story">
          <span className="brilhio-pill">Desktop web alpha</span>
          <h1>Plan the full social week before you worry about the app shell.</h1>
          <p>
            Brilhio&apos;s first priority is a strong desktop control room where
            teams can upload media, see the whole week, link channels, and
            decide where AI should guide the schedule.
          </p>

          <div className="auth-highlight-grid">
            {authHighlights.map((highlight) => (
              <article key={highlight.value} className="auth-highlight-card">
                <strong>{highlight.value}</strong>
                <p>{highlight.label}</p>
              </article>
            ))}
          </div>

          <div className="auth-preview-card">
            <div className="preview-head">
              <span className="brilhio-eyebrow">First-time setup preview</span>
              <strong>What onboarding should establish before the dashboard</strong>
            </div>
            <div className="preview-list">
              {onboardingPreview.map((item) => (
                <div key={item.title} className="preview-row">
                  <span>{item.title}</span>
                  <strong>{item.body}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <section className="brilhio-card auth-form-card">
            <div className="form-head">
              <p className="brilhio-eyebrow">Sign in</p>
              <h2>Welcome back</h2>
            </div>

            {showAuthRequiredMessage ? (
              <p className="demo-status demo-status-warn">
                Sign in to continue.
              </p>
            ) : null}

            {showSignedOutMessage ? (
              <p className="demo-status demo-status-ok">
                Signed out successfully.
              </p>
            ) : null}

            <form onSubmit={handleSubmit}>
              <label className="field-stack">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className="field-stack">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              {error ? <p className="demo-status demo-status-warn">{error}</p> : null}

              <div className="inline-actions">
                <button
                  type="submit"
                  className="brilhio-button brilhio-button-primary"
                  disabled={loading}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
                <Link href="/join" className="brilhio-button brilhio-button-secondary">
                  Create an account
                </Link>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
