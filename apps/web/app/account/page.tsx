"use client";

import { useState } from "react";
import { ProductShell } from "../ui/product-shell";
import { apiFetch } from "../../lib/api-client";

function getIanaTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Australia/Sydney",
    ];
  }
}

function TimezoneSelector() {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timezones = getIanaTimezones();

  async function handleChange(next: string) {
    setTimezone(next);
    setStatus("saving");
    try {
      const res = await apiFetch("/api/me/timezone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: next }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <section className="brilhio-card surface-card">
      <div className="surface-head compact-head">
        <div>
          <p className="brilhio-eyebrow">Scheduling</p>
          <h2>Timezone</h2>
        </div>
        {status === "saving" && <span className="state-badge status-info">Saving…</span>}
        {status === "saved" && <span className="state-badge status-ok">Saved</span>}
        {status === "error" && <span className="state-badge status-warn">Error</span>}
      </div>
      <p className="surface-body-text">
        All scheduled posts use this timezone. Posts you schedule at "3 PM" will publish at 3 PM in this zone.
      </p>
      <label className="field-stack">
        <span>Timezone</span>
        <select
          value={timezone}
          onChange={(e) => handleChange(e.target.value)}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

function PrivacyPanel() {
  const [status, setStatus] = useState<"idle" | "exporting" | "deleting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function exportAccountData() {
    setStatus("exporting");
    setMessage("");
    try {
      const response = await apiFetch("/api/me/export");
      const json = await response.json();
      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Export failed.");
      }

      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `brilhio-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("done");
      setMessage("Account export generated.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Account export failed.");
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Delete this Brilhio account? Any linked Stripe subscription/customer will be cancelled first. This cannot be undone.",
    );
    if (!confirmed) return;

    setStatus("deleting");
    setMessage("");
    try {
      const response = await apiFetch("/api/me", { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Account deletion failed.");
      }
      window.location.assign("/sign-out");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Account deletion failed.");
    }
  }

  return (
    <section className="brilhio-card surface-card">
      <div className="surface-head compact-head">
        <div>
          <p className="brilhio-eyebrow">Privacy</p>
          <h2>Account data</h2>
        </div>
        {status !== "idle" ? <span className="state-badge status-info">{status}</span> : null}
      </div>

      <p className="surface-body-text">
        Export your account data or permanently delete the account. Deletion cancels linked Stripe billing before removing the Supabase user.
      </p>

      {message ? (
        <p className={`demo-status ${status === "error" ? "demo-status-warn" : "demo-status-ok"}`}>
          {message}
        </p>
      ) : null}

      <div className="inline-actions">
        <button
          className="brilhio-button brilhio-button-secondary"
          onClick={exportAccountData}
          disabled={status === "exporting" || status === "deleting"}
        >
          Export data
        </button>
        <button
          className="brilhio-button brilhio-button-secondary"
          onClick={deleteAccount}
          disabled={status === "exporting" || status === "deleting"}
        >
          Delete account
        </button>
      </div>
    </section>
  );
}

export default function AccountPage() {
  return (
    <ProductShell activePath="/account">
      <div className="accounts-layout">
        <div className="rail-layout">
          <TimezoneSelector />
          <PrivacyPanel />
        </div>
      </div>
    </ProductShell>
  );
}
