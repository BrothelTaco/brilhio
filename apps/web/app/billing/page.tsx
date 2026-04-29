"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "../../lib/api-client";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const subscriptionRequired = searchParams.get("reason") === "subscription-required";

  async function startCheckout() {
    setStatus("loading");
    setError("");
    try {
      const response = await apiFetch("/api/billing/checkout-session", {
        method: "POST",
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && typeof json.data?.url === "string") {
        window.location.assign(json.data.url);
        return;
      }
      setError(typeof json.error === "string" ? json.error : "Could not start checkout.");
      setStatus("error");
    } catch {
      setError("Could not reach billing checkout.");
      setStatus("error");
    }
  }

  return (
    <main className="auth-page">
      <section className="brilhio-shell auth-grid">
        <div className="auth-story">
          <span className="brilhio-pill">Billing</span>
          <h1>Activate Brilhio to open the workspace.</h1>
          <p>
            Your account is created. Complete checkout to unlock scheduling,
            connected accounts, content workflows, and AI recommendations.
          </p>
        </div>

        <div className="auth-panel">
          <section className="brilhio-card auth-form-card">
            <div className="form-head">
              <p className="brilhio-eyebrow">Subscription</p>
              <h2>Continue to payment</h2>
              <p>Secure checkout is hosted by Stripe.</p>
            </div>

            {subscriptionRequired ? (
              <p className="demo-status demo-status-warn">
                An active subscription is required to continue.
              </p>
            ) : null}

            {error ? <p className="demo-status demo-status-warn">{error}</p> : null}

            <button
              className="brilhio-button brilhio-button-primary"
              onClick={startCheckout}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Opening checkout..." : "Open Stripe checkout"}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
