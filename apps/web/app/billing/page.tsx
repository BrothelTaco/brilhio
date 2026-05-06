"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api-client";

type BillingProfile = {
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
};

function formatBillingDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function billingStatusLabel(status: string | null | undefined) {
  if (!status) return "Inactive";
  return status.replace(/_/g, " ");
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [portalStatus, setPortalStatus] = useState<"idle" | "loading" | "error">("idle");
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const subscriptionRequired = searchParams.get("reason") === "subscription-required";

  useEffect(() => {
    let active = true;

    apiFetch("/api/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.data?.profile) {
          setProfile(json.data.profile);
          setProfileStatus("ready");
          return;
        }
        setProfileStatus("error");
      })
      .catch(() => {
        if (active) setProfileStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

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

  async function openCustomerPortal() {
    setPortalStatus("loading");
    setError("");
    try {
      const response = await apiFetch("/api/billing/portal-session", {
        method: "POST",
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && typeof json.data?.url === "string") {
        window.location.assign(json.data.url);
        return;
      }
      setError(typeof json.error === "string" ? json.error : "Could not open billing portal.");
      setPortalStatus("error");
    } catch {
      setError("Could not reach billing portal.");
      setPortalStatus("error");
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

            <div className="stack-list">
              <article className="list-row list-row-stack">
                <div>
                  <strong>Current plan</strong>
                  <p>Brilhio subscription</p>
                </div>
                <span className="state-badge status-info">
                  {profileStatus === "loading" ? "loading" : billingStatusLabel(profile?.subscriptionStatus)}
                </span>
              </article>
              <article className="list-row list-row-stack">
                <div>
                  <strong>Renewal date</strong>
                  <p>
                    {profile?.subscriptionCancelAtPeriodEnd
                      ? "Access ends at the period close"
                      : "Next billing period"}
                  </p>
                </div>
                <span className="state-badge status-info">
                  {formatBillingDate(profile?.subscriptionCurrentPeriodEnd ?? null)}
                </span>
              </article>
              <article className="list-row list-row-stack">
                <div>
                  <strong>Stripe customer</strong>
                  <p>{profile?.email ?? "Account billing profile"}</p>
                </div>
                <span className="state-badge status-info">
                  {profile?.stripeCustomerId ? "linked" : "not linked"}
                </span>
              </article>
            </div>

            <button
              className="brilhio-button brilhio-button-primary"
              onClick={startCheckout}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Opening checkout..." : "Open Stripe checkout"}
            </button>
            <button
              className="brilhio-button brilhio-button-secondary"
              onClick={openCustomerPortal}
              disabled={portalStatus === "loading"}
            >
              {portalStatus === "loading" ? "Opening portal..." : "Manage billing"}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
