"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api-client";
import { createClient } from "../../lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      try {
        const response = await apiFetch("/api/billing/checkout-session", {
          method: "POST",
        });
        const json = await response.json().catch(() => ({}));
        if (response.ok && typeof json.data?.url === "string") {
          window.location.assign(json.data.url);
          return;
        }
        if (response.status !== 501) {
          setError(
            typeof json.error === "string"
              ? json.error
              : "Account created, but checkout could not be started.",
          );
          setLoading(false);
          return;
        }
      } catch {
        setError("Account created, but checkout could not be reached.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <div className="brilhio-shell auth-grid">
        <div className="auth-story">
          <span className="brilhio-pill">Join Brilhio</span>
          <h1>Plan the full social week before you worry about the app shell.</h1>
          <p>
            One desktop command center for scheduling, account linking, media
            intake, and AI-guided publishing — built for artists, bands, and
            small creative teams.
          </p>
        </div>

        <div className="auth-panel">
          <section className="brilhio-card auth-form-card">
            <div className="form-head">
              <p className="brilhio-eyebrow">Create account</p>
              <h2>Get started with Brilhio</h2>
              <p>Enter your email and choose a password to continue to payment.</p>
            </div>

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
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>

              {error ? (
                <p className="demo-status demo-status-warn">{error}</p>
              ) : null}

              <div className="inline-actions">
                <button
                  type="submit"
                  className="brilhio-button brilhio-button-primary"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Continue to payment"}
                </button>
                <Link href="/" className="brilhio-button brilhio-button-secondary">
                  Already have an account?
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
