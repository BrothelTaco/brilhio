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

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupTeam, setSignupTeam] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const showAuthRequiredMessage = searchParams.get("reason") === "auth-required";
  const showSignedOutMessage = searchParams.get("signedOut") === "1";

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    setLoginLoading(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    router.push("/schedule");
    router.refresh();
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError("");
    setSignupLoading(true);

    const displayName = signupName.trim() || signupTeam.trim() || signupEmail.trim().split("@")[0];

    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: { display_name: displayName, team: signupTeam.trim() },
      },
    });

    setSignupLoading(false);

    if (error) {
      setSignupError(error.message);
      return;
    }

    router.push("/onboarding");
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
              <h2>Return to the workspace</h2>
            </div>

            {showAuthRequiredMessage ? (
              <p className="demo-status demo-status-warn">
                Sign in to continue to dashboard pages.
              </p>
            ) : null}

            {showSignedOutMessage ? (
              <p className="demo-status demo-status-ok">
                Signed out successfully.
              </p>
            ) : null}

            <form onSubmit={handleLoginSubmit}>
              <label className="field-stack">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </label>

              <label className="field-stack">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </label>

              {loginError ? <p className="demo-status demo-status-warn">{loginError}</p> : null}

              <div className="inline-actions">
                <button
                  type="submit"
                  className="brilhio-button brilhio-button-primary"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Signing in…" : "Enter workspace"}
                </button>
                <a href="#create-account" className="brilhio-button brilhio-button-secondary">
                  Need an account?
                </a>
              </div>
            </form>
          </section>

          <section id="create-account" className="brilhio-card auth-form-card auth-form-muted">
            <div className="form-head">
              <p className="brilhio-eyebrow">Create account</p>
              <h2>Start a new workspace</h2>
              <p>
                Set up the desktop planning environment first, then layer in
                automation and native mobile later.
              </p>
            </div>

            <form onSubmit={handleSignupSubmit}>
              <div className="split-fields">
                <label className="field-stack">
                  <span>Name</span>
                  <input
                    type="text"
                    placeholder="Josh Kinsley"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Team</span>
                  <input
                    type="text"
                    placeholder="Brilhio Studio"
                    value={signupTeam}
                    onChange={(event) => setSignupTeam(event.target.value)}
                  />
                </label>
              </div>

              <label className="field-stack">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="founder@company.com"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  required
                />
              </label>

              <label className="field-stack">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </label>

              <label className="field-stack">
                <span>What do you want first?</span>
                <select defaultValue="calendar">
                  <option value="calendar">Weekly calendar planning</option>
                  <option value="accounts">Account linking</option>
                  <option value="media">Media intake and AI guidance</option>
                </select>
              </label>

              {signupError ? <p className="demo-status demo-status-warn">{signupError}</p> : null}

              <div className="inline-actions">
                <button
                  type="submit"
                  className="brilhio-button brilhio-button-primary"
                  disabled={signupLoading}
                >
                  {signupLoading ? "Creating account…" : "Continue to onboarding"}
                </button>
                <Link href="/account" className="brilhio-button brilhio-button-secondary">
                  Preview account profile
                </Link>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
