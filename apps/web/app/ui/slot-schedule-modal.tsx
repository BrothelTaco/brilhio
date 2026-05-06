"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AssetKind, RecommendedSlot } from "@brilhio/contracts";
import { apiFetch } from "../../lib/api-client";
import { createClient } from "../../lib/supabase/client";
import { PlatformIcon } from "./platform-icons";

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "uploaded"; mediaAssetId: string; fileName: string; assetKind: AssetKind }
  | { kind: "scheduling" }
  | { kind: "error"; message: string };

type UploadSession = {
  bucket: string;
  storagePath: string;
  uploadPath: string;
  uploadToken: string;
  contentType: string;
};

function inferAssetKind(file: File): AssetKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "document";
  return "image";
}

function fileTitleFrom(name: string): string {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).trim() || "Untitled";
}

function formatLocal(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SlotScheduleModal({
  slot,
  onClose,
  onScheduled,
}: {
  slot: RecommendedSlot;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [caption, setCaption] = useState("");
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && phase.kind !== "uploading" && phase.kind !== "scheduling") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, phase.kind]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhase({ kind: "uploading", fileName: file.name });

    try {
      const sessionRes = await apiFetch("/api/media-assets/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: inferAssetKind(file),
          title: fileTitleFrom(file.name),
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
          altText: null,
          durationSeconds: null,
        }),
      });
      const sessionJson = await sessionRes.json().catch(() => ({}));
      if (!sessionRes.ok) {
        throw new Error(typeof sessionJson.error === "string" ? sessionJson.error : "Could not start upload.");
      }

      const session: UploadSession = sessionJson.data;
      const supabase = createClient();
      const upload = await supabase.storage
        .from(session.bucket)
        .uploadToSignedUrl(session.uploadPath, session.uploadToken, file, {
          contentType: file.type || undefined,
        });
      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const assetKind = inferAssetKind(file);
      const assetRes = await apiFetch("/api/media-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: assetKind,
          title: fileTitleFrom(file.name),
          storagePath: session.storagePath,
          altText: null,
          durationSeconds: null,
        }),
      });
      const assetJson = await assetRes.json().catch(() => ({}));
      if (!assetRes.ok) {
        throw new Error(typeof assetJson.error === "string" ? assetJson.error : "Could not register media.");
      }

      setPhase({
        kind: "uploaded",
        mediaAssetId: assetJson.data.id,
        fileName: file.name,
        assetKind,
      });
    } catch (error) {
      setPhase({
        kind: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  async function handleSchedule() {
    if (phase.kind !== "uploaded" || !caption.trim()) return;
    const mediaAssetId = phase.mediaAssetId;
    setPhase({ kind: "scheduling" });

    try {
      const res = await apiFetch(`/api/me/recommended-slots/${slot.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaAssetIds: [mediaAssetId],
          platformCaption: caption.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Scheduling failed.");
      }
      onScheduled();
    } catch (error) {
      setPhase({
        kind: "error",
        message: error instanceof Error ? error.message : "Scheduling failed.",
      });
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await apiFetch(`/api/me/recommended-slots/${slot.id}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(typeof json.error === "string" ? json.error : "Could not dismiss slot.");
      }
      onScheduled();
    } catch (error) {
      setPhase({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not dismiss slot.",
      });
      setDismissing(false);
    }
  }

  if (!mounted) return null;

  const busy = phase.kind === "uploading" || phase.kind === "scheduling" || dismissing;
  const canSchedule = phase.kind === "uploaded" && caption.trim().length > 0 && !busy;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-labelledby="slot-modal-title">
        <header className="modal-head">
          <div>
            <p className="brilhio-eyebrow">Recommended slot</p>
            <h2 id="slot-modal-title" className="modal-title">
              {slot.contentTypeHint}
            </h2>
            <p className="modal-meta">
              <span className="modal-meta-icon">
                <PlatformIcon platform={slot.platform} size={14} />
              </span>
              <span className="modal-meta-platform">{slot.platform}</span>
              <span className="modal-meta-sep">·</span>
              <span>{formatLocal(slot.suggestedFor)}</span>
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {slot.rationale ? <p className="modal-rationale">{slot.rationale}</p> : null}

        <section className="modal-section">
          <label className="field-stack">
            <span>Media</span>
            {phase.kind === "uploaded" ? (
              <div className="modal-file-summary">
                <strong>{phase.fileName}</strong>
                <span className="state-badge status-ok">Uploaded · {phase.assetKind}</span>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={handleFileChange}
                disabled={phase.kind === "uploading" || phase.kind === "scheduling"}
              />
            )}
            {phase.kind === "uploading" ? (
              <p className="demo-status demo-status-ok">Uploading {phase.fileName}…</p>
            ) : null}
          </label>
        </section>

        <section className="modal-section">
          <label className="field-stack">
            <span>Caption for {slot.platform}</span>
            <textarea
              rows={4}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What should the post say?"
              disabled={busy}
            />
          </label>
        </section>

        {phase.kind === "error" ? (
          <p className="demo-status demo-status-warn">{phase.message}</p>
        ) : null}

        <footer className="modal-actions">
          <button
            className="brilhio-button brilhio-button-secondary"
            onClick={handleDismiss}
            disabled={busy}
          >
            {dismissing ? "Dismissing…" : "Dismiss slot"}
          </button>
          <div className="modal-primary-actions">
            <button
              className="brilhio-button brilhio-button-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="brilhio-button brilhio-button-primary"
              onClick={handleSchedule}
              disabled={!canSchedule}
            >
              {phase.kind === "scheduling" ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
