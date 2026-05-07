"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductShell } from "../ui/product-shell";
import { PlatformIcon } from "../ui/platform-icons";
import { apiFetch } from "../../lib/api-client";

type Platform = "instagram" | "tiktok" | "facebook" | "x";
type SocialAccountStatus = "connected" | "attention_required" | "disconnected";

type ConnectedAccount = {
  id: string;
  handle: string;
  status: SocialAccountStatus;
  tokenExpiresAt: string | null;
};

type ProviderItem = {
  platform: Platform;
  displayName: string;
  oauthEnabled?: boolean;
  account: ConnectedAccount | null;
};

const FALLBACK_PROVIDERS: ProviderItem[] = [
  { platform: "instagram", displayName: "Instagram", account: null },
  { platform: "tiktok", displayName: "TikTok", account: null },
  { platform: "facebook", displayName: "Facebook", account: null },
  { platform: "x", displayName: "X", account: null },
];

function statusLabel(status: SocialAccountStatus) {
  if (status === "connected") return "Connected";
  if (status === "attention_required") return "Needs attention";
  return "Not connected";
}

function statusClass(status: SocialAccountStatus) {
  if (status === "connected") return "status-ok";
  if (status === "attention_required") return "status-warn";
  return "status-muted";
}

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<ProviderItem[]>(FALLBACK_PROVIDERS);
  const [loadingPlatform, setLoadingPlatform] = useState<Platform | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<Platform | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  const fetchProviders = useCallback(async () => {
    try {
      const res = await apiFetch("/api/providers");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          tone: "error",
          text:
            typeof json.message === "string"
              ? json.message
              : typeof json.error === "string"
                ? json.error
              : "Could not load connected platforms.",
        });
        return;
      }

      setProviders(json.data);
    } catch {
      setMessage({
        tone: "error",
        text: "Could not reach the server to load connected platforms.",
      });
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    const oauthPlatform = searchParams.get("platform");
    const oauthReason = searchParams.get("reason");

    if (oauthStatus === "connected") {
      setMessage({
        tone: "success",
        text: `${oauthPlatform ?? "Provider"} connected successfully.`,
      });
    } else if (oauthStatus === "failed") {
      setMessage({
        tone: "error",
        text: `Connection failed: ${oauthReason ?? "Please try again."}`,
      });
    }
  }, [searchParams]);

  async function startOAuthConnect(platform: Platform) {
    setMessage(null);
    setLoadingPlatform(platform);

    try {
      const res = await apiFetch(`/api/providers/${platform}/oauth/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/accounts" }),
      });
      const json = await res.json().catch(() => ({}));
      const authorizationUrl =
        typeof json?.data?.authorizationUrl === "string"
          ? json.data.authorizationUrl
          : null;

      if (!res.ok || !authorizationUrl) {
        setMessage({
          tone: "error",
          text:
            typeof json.message === "string"
              ? json.message
              : typeof json.error === "string"
                ? json.error
              : "Could not start the provider connection.",
        });
        setLoadingPlatform(null);
        return;
      }

      window.location.assign(authorizationUrl);
    } catch {
      setMessage({
        tone: "error",
        text: "Could not reach the server to start the provider connection.",
      });
      setLoadingPlatform(null);
    }
  }

  async function disconnectAccount(platform: Platform) {
    setMessage(null);
    setDisconnectingPlatform(platform);

    try {
      const res = await apiFetch(`/api/providers/${platform}/disconnect`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          tone: "error",
          text:
            typeof json.message === "string"
              ? json.message
              : typeof json.error === "string"
                ? json.error
              : "Could not disconnect the account.",
        });
        return;
      }

      setMessage({ tone: "success", text: "Account disconnected." });
      await fetchProviders();
    } catch {
      setMessage({
        tone: "error",
        text: "Could not reach the server to disconnect the account.",
      });
    } finally {
      setDisconnectingPlatform(null);
    }
  }

  return (
    <ProductShell activePath="/accounts">
      <div className="linked-platforms-page">
        <div className="page-header">
          <div>
            <p className="brilhio-eyebrow">Accounts</p>
            <h1>Linked Platforms</h1>
            <p>Connect your social accounts to enable scheduling and automated publishing.</p>
          </div>
        </div>

        {message && (
          <div
            className={`lp-oauth-banner brilhio-card ${
              message.tone === "success" ? "lp-oauth-banner-success" : "lp-oauth-banner-error"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="provider-grid accounts-provider-grid">
          {providers.map((provider) => {
            const account =
              provider.account && provider.account.status !== "disconnected"
                ? provider.account
                : null;
            const isConnected = account?.status === "connected";
            const isLoading = loadingPlatform === provider.platform;
            const isDisconnecting = disconnectingPlatform === provider.platform;

            return (
              <article key={provider.platform} className="provider-card brilhio-card">
                <div className="provider-head">
                  <div className="lp-provider-identity">
                    <PlatformIcon platform={provider.platform} size={26} />
                    <h2>{provider.displayName}</h2>
                  </div>
                  {account ? (
                    <span className={`state-badge ${statusClass(account.status)}`}>
                      {isConnected ? account.handle : statusLabel(account.status)}
                    </span>
                  ) : (
                    <span className="state-badge status-muted">Not connected</span>
                  )}
                </div>

                <div className="lp-account-action-row">
                  {account ? (
                    <button
                      className="brilhio-button brilhio-button-secondary lp-disconnect-btn"
                      onClick={() => disconnectAccount(provider.platform)}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? "Disconnecting..." : "Disconnect account"}
                    </button>
                  ) : (
                    <button
                      className="lp-connect-btn brilhio-button brilhio-button-primary"
                      onClick={() => startOAuthConnect(provider.platform)}
                      disabled={isLoading}
                    >
                      {isLoading ? "Redirecting..." : "Connect account"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
