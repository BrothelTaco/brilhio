"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function firstParam(value: string | null) {
  return value ?? "";
}

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const tokenHash = firstParam(searchParams.get("token_hash"));
  const type = firstParam(searchParams.get("type"));
  const redirectTo = firstParam(searchParams.get("redirect_to"));
  const next = firstParam(searchParams.get("next"));
  const hasToken = Boolean(tokenHash && type);

  return (
    <main className="auth-page">
      <section className="brilhio-shell auth-grid">
        <div className="auth-story">
          <span className="brilhio-pill">Confirm email</span>
          <h1>One more click to activate your Brilhio account.</h1>
          <p>
            Confirming here protects the one-time email token from automated
            link scans before Brilhio creates your signed-in session.
          </p>
        </div>

        <div className="auth-panel">
          <section className="brilhio-card auth-form-card">
            <div className="form-head">
              <p className="brilhio-eyebrow">Email confirmation</p>
              <h2>{hasToken ? "Confirm your account" : "Invalid confirmation link"}</h2>
              <p>
                {hasToken
                  ? "Click the button below to finish confirming your email."
                  : "This confirmation link is missing its token. Request a fresh signup email."}
              </p>
            </div>

            {hasToken ? (
              <form action="/auth/confirm" method="post">
                <input type="hidden" name="token_hash" value={tokenHash} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="redirect_to" value={redirectTo} />
                <input type="hidden" name="next" value={next} />
                <button type="submit" className="brilhio-button brilhio-button-primary">
                  Confirm email
                </button>
              </form>
            ) : (
              <Link href="/join" className="brilhio-button brilhio-button-primary">
                Back to signup
              </Link>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
