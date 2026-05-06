"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/schedule");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="brilhio-shell auth-grid">
        <div className="auth-story">
          <span className="brilhio-pill">Account recovery</span>
          <h1>Choose a new password.</h1>
          <p>Your reset link has been confirmed. Set a new password to continue.</p>
        </div>

        <div className="auth-panel">
          <section className="brilhio-card auth-form-card">
            <div className="form-head">
              <p className="brilhio-eyebrow">New password</p>
              <h2>Update password</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="field-stack">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </label>

              {error ? <p className="demo-status demo-status-warn">{error}</p> : null}

              <button
                type="submit"
                className="brilhio-button brilhio-button-primary"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
