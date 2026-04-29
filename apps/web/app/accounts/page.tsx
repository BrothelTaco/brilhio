"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductShell } from "../ui/product-shell";
import { PlatformIcon } from "../ui/platform-icons";
import { connectionChecklist, automationGuardrails } from "../ui/scaffold-data";

type Platform = "instagram" | "tiktok" | "facebook" | "x";
type SocialAccountStatus = "connected" | "attention_required" | "disconnected";

type ConnectedAccount = {
  id: string;
  handle: string;
  status: SocialAccountStatus;
  audienceLabel: string;
  tokenExpiresAt: string | null;
};

type ProviderItem = {
  platform: Platform;
  displayName: string;
  description: string;
  connectionMode: string;
  publishMode: string;
  supportedAssetKinds: string[];
  account: ConnectedAccount | null;
};

type ConnectState =
  | { phase: "idle" }
  | { phase: "open"; platform: Platform }
  | { phase: "loading"; platform: Platform }
  | { phase: "success"; platform: Platform }
  | { phase: "error"; platform: Platform; message: string };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const FALLBACK_PROVIDERS: ProviderItem[] = [
  {
    platform: "instagram",
    displayName: "Instagram",
    description: "Short-form visual publishing with image, video, and carousel support.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["image", "video", "carousel"],
    account: null,
  },
  {
    platform: "tiktok",
    displayName: "TikTok",
    description: "Video-first publishing tuned for short-form discovery loops.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["video"],
    account: null,
  },
  {
    platform: "facebook",
    displayName: "Facebook",
    description: "Community publishing for page updates, launches, and mixed media campaigns.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["image", "video", "carousel", "document"],
    account: null,
  },
  {
    platform: "x",
    displayName: "X",
    description: "Text-led distribution for updates, launch threads, and short commentary.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["image", "video"],
    account: null,
  },
];

function statusLabel(status: SocialAccountStatus) {
  if (status === "connected") return "Connected";
  if (status === "attention_required") return "Needs attention";
  return "Disconnected";
}

function statusClass(status: SocialAccountStatus) {
  if (status === "connected") return "status-ok";
  if (status === "attention_required") return "status-warn";
  return "status-muted";
}

export default function AccountsPage() {
  const [providers, setProviders] = useState<ProviderItem[]>(FALLBACK_PROVIDERS);
  const [handle, setHandle] = useState("");
  const [audienceLabel, setAudienceLabel] = useState("");
  const [connectState, setConnectState] = useState<ConnectState>({ phase: "idle" });

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/providers`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setProviders(json.data);
      }
    } catch {
      // API not reachable — fallback stays in place
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function openConnect(platform: Platform) {
    setHandle("");
    setAudienceLabel("");
    setConnectState({ phase: "open", platform });
  }

  function cancelConnect() {
    setConnectState({ phase: "idle" });
  }

  async function submitConnect(platform: Platform) {
    if (!handle.trim()) return;
    setConnectState({ phase: "loading", platform });
    try {
      const res = await fetch(`${API_BASE}/api/providers/${platform}/connect`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: handle.trim(),
          audienceLabel: audienceLabel.trim() || "General audience",
        }),
      });
      if (res.ok) {
        setConnectState({ phase: "success", platform });
        await fetchProviders();
        setTimeout(() => setConnectState({ phase: "idle" }), 1400);
      } else {
        const json = await res.json().catch(() => ({}));
        setConnectState({
          phase: "error",
          platform,
          message: typeof json.error === "string" ? json.error : "Connection failed.",
        });
      }
    } catch {
      setConnectState({ phase: "error", platform, message: "Could not reach the server." });
    }
  }

  return (
    <ProductShell activePath="/accounts">
      <div className="linked-platforms-page">
        <div className="page-header">
          <div>
            <p className="brilhio-eyebrow">Accounts</p>
            <h1>Linked Platforms</h1>
            <p>
              Connect your social accounts to enable scheduling and automated
              publishing.
            </p>
          </div>
        </div>

        <div className="accounts-layout">
          <div className="provider-grid">
            {providers.map((provider) => {
              const isOpen =
                connectState.phase !== "idle" && connectState.platform === provider.platform;
              const isLoading =
                connectState.phase === "loading" && connectState.platform === provider.platform;
              const isSuccess =
                connectState.phase === "success" && connectState.platform === provider.platform;
              const isError =
                connectState.phase === "error" && connectState.platform === provider.platform;
              const account = provider.account;

              return (
                <article key={provider.platform} className="provider-card brilhio-card">
                  <div className="provider-head">
                    <div className="lp-provider-identity">
                      <PlatformIcon platform={provider.platform} size={26} />
                      <h2>{provider.displayName}</h2>
                    </div>
                    {account ? (
                      <span className={`state-badge ${statusClass(account.status)}`}>
                        {statusLabel(account.status)}
                      </span>
                    ) : (
                      <span className="state-badge status-muted">Not connected</span>
                    )}
                  </div>

                  <p className="provider-copy">{provider.description}</p>

                  <div className="provider-section">
                    <span>Formats</span>
                    <div className="chip-row">
                      {provider.supportedAssetKinds.map((kind) => (
                        <span key={kind} className="capability-chip capability-chip-alt">
                          {kind}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="provider-section">
                    <span>Mode</span>
                    <div className="chip-row">
                      <span className="capability-chip">{provider.connectionMode}</span>
                      <span className="capability-chip">{provider.publishMode}</span>
                    </div>
                  </div>

                  {account && !isOpen && (
                    <div className="lp-connected-state">
                      <div className="lp-connected-row">
                        <PlatformIcon platform={provider.platform} size={14} />
                        <span className="lp-connected-handle">{account.handle}</span>
                        <span className="lp-connected-sep">·</span>
                        <span className="lp-connected-audience">{account.audienceLabel}</span>
                      </div>
                      <button className="lp-secondary-btn" onClick={() => openConnect(provider.platform)}>
                        Reconnect
                      </button>
                    </div>
                  )}

                  {!account && !isOpen && (
                    <button
                      className="lp-connect-btn brilhio-button brilhio-button-primary"
                      onClick={() => openConnect(provider.platform)}
                    >
                      Connect account
                    </button>
                  )}

                  {isOpen && (
                    <div className="lp-connect-form">
                      <div className="field-stack">
                        <span>Handle or username</span>
                        <input
                          type="text"
                          placeholder="@yourhandle"
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          disabled={isLoading || isSuccess}
                          autoFocus
                        />
                      </div>
                      <div className="field-stack">
                        <span>Audience label</span>
                        <input
                          type="text"
                          placeholder="e.g. Music fans 18–34"
                          value={audienceLabel}
                          onChange={(e) => setAudienceLabel(e.target.value)}
                          disabled={isLoading || isSuccess}
                        />
                      </div>
                      {isError && (
                        <p className="lp-form-status lp-form-error">
                          {(connectState as { message: string }).message}
                        </p>
                      )}
                      {isSuccess && (
                        <p className="lp-form-status lp-form-success">Account connected.</p>
                      )}
                      <div className="lp-form-actions">
                        <button
                          className="brilhio-button brilhio-button-primary lp-form-submit"
                          onClick={() => submitConnect(provider.platform)}
                          disabled={!handle.trim() || isLoading || isSuccess}
                        >
                          {isLoading ? "Connecting…" : "Confirm"}
                        </button>
                        <button
                          className="brilhio-button brilhio-button-secondary"
                          onClick={cancelConnect}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="rail-layout">
            <div className="brilhio-card lp-rail-card">
              <h3 className="lp-rail-title">Before you connect</h3>
              <div className="stack-list">
                {connectionChecklist.map((item, i) => (
                  <div key={i} className="bullet-row">
                    <div className="bullet-dot" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="brilhio-card lp-rail-card">
              <h3 className="lp-rail-title">Automation guardrails</h3>
              <div className="stack-list">
                {automationGuardrails.map((g) => (
                  <div key={g.title} className="lp-guardrail-item">
                    <strong>{g.title}</strong>
                    <p>{g.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
