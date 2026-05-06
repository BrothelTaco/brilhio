"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a password reset link.");
  }

  return (
    <main className="auth-page">
      <section className="brilhio-shell auth-grid">
        <div className="auth-story">
          <span className="brilhio-pill">Account recovery</span>
          <h1>Reset your Brilhio password.</h1>
          <p>Enter the email on your account and we will send a secure reset link.</p>
        </div>

        <div className="auth-panel">
          <section className="brilhio-card auth-form-card">
            <div className="form-head">
              <p className="brilhio-eyebrow">Password reset</p>
              <h2>Send reset link</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="field-stack">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </label>

              {message ? (
                <p className={`demo-status ${status === "error" ? "demo-status-warn" : "demo-status-ok"}`}>
                  {message}
                </p>
              ) : null}

              <div className="inline-actions">
                <button
                  type="submit"
                  className="brilhio-button brilhio-button-primary"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Sending..." : "Send reset link"}
                </button>
                <Link href="/" className="brilhio-button brilhio-button-secondary">
                  Back to sign in
                </Link>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
