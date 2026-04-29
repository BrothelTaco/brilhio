"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PlatformIcon } from "./platform-icons";
import type { PlatformId } from "./scaffold-data";

export type Post = {
  platform: PlatformId;
  time: string;
  type: "media+caption" | "text-only" | "media-only";
  mediaColor: string | null;
  caption: string | null;
};

const CARD_WIDTH = 220;
const CARD_GAP = 10;
const HIDE_DELAY_MS = 120;

function usePortalMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ── Icons ─────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Delete confirmation ───────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="delete-confirm">
      <p className="delete-confirm-text">Delete this post?</p>
      <div className="delete-confirm-actions">
        <button className="tooltip-action-btn" onClick={onCancel}>Cancel</button>
        <button className="tooltip-action-btn tooltip-action-delete-confirm" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  );
}

// ── Single post card content (used both in cell and in panel) ─

function PostCardContent({ post, onMouseEnter, onMouseLeave, cardRef }: {
  post: Post;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  cardRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={cardRef}
      className="slot-post-wrapper"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <article className="slot-post">
        <div className="slot-post-header">
          <span className="slot-platform-icon">
            <PlatformIcon platform={post.platform} size={12} />
          </span>
          <span className="slot-time">{post.time}</span>
        </div>

        {post.type !== "text-only" && post.mediaColor && (
          <div className="slot-media-frame" style={{ background: post.mediaColor }} />
        )}

        {post.caption && (
          <p className={post.type === "text-only" ? "slot-caption slot-caption-text" : "slot-caption"}>
            {post.caption}
          </p>
        )}
      </article>
    </div>
  );
}

// ── Tooltip panel (portal) — shows 1 or N cards side by side ─

type PanelProps = {
  posts: Post[];
  anchorRect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function TooltipPanel({ posts, anchorRect, onMouseEnter, onMouseLeave }: PanelProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const count = posts.length;
  const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;

  // Center the panel over the anchor, clamped to viewport
  const idealLeft = anchorRect.left + anchorRect.width / 2 - totalWidth / 2;
  const left = Math.max(8, Math.min(idealLeft, vw - totalWidth - 8));
  const top = anchorRect.top - 10;

  return createPortal(
    <div
      className="tooltip-panel"
      style={{ position: "fixed", left, top, transform: "translateY(-100%)" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {posts.map((post, i) => (
        <div key={i} className="tooltip-card" style={{ width: CARD_WIDTH }}>
          <div className="slot-tooltip-header">
            <span className="slot-tooltip-platform">
              <PlatformIcon platform={post.platform} size={14} />
            </span>
            <span className="slot-time">{post.time}</span>
          </div>

          {post.type !== "text-only" && post.mediaColor && (
            <div className="slot-tooltip-media" style={{ background: post.mediaColor }} />
          )}

          {post.caption && (
            <p className="slot-tooltip-caption">{post.caption}</p>
          )}

          {post.type === "media-only" && (
            <p className="slot-tooltip-meta">Media only — no caption</p>
          )}

          {deleteIndex === i ? (
            <DeleteConfirm
              onConfirm={() => { setDeleteIndex(null); /* wire delete here */ }}
              onCancel={() => setDeleteIndex(null)}
            />
          ) : (
            <div className="slot-tooltip-actions">
              <button className="tooltip-action-btn" aria-label="Edit post">
                <PencilIcon />
                <span>Edit</span>
              </button>
              <button
                className="tooltip-action-btn tooltip-action-delete"
                aria-label="Delete post"
                onClick={() => setDeleteIndex(i)}
              >
                <TrashIcon />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}

// ── PostCard — single post with tooltip, used by day columns ─

export function PostCard({ post }: { post: Post }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const mounted = usePortalMounted();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setRect(null), HIDE_DELAY_MS);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    if (!rect) return;
    const update = () => {
      if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", update, { capture: true });
  }, [rect]);

  return (
    <>
      <div
        ref={cardRef}
        className="slot-post-wrapper"
        onMouseEnter={() => { cancelHide(); if (cardRef.current) setRect(cardRef.current.getBoundingClientRect()); }}
        onMouseLeave={scheduleHide}
      >
        <article className="slot-post">
          <div className="slot-post-header">
            <span className="slot-platform-icon">
              <PlatformIcon platform={post.platform} size={12} />
            </span>
            <span className="slot-time">{post.time}</span>
          </div>
          {post.type !== "text-only" && post.mediaColor && (
            <div className="slot-media-frame" style={{ background: post.mediaColor }} />
          )}
          {post.caption && (
            <p className={post.type === "text-only" ? "slot-caption slot-caption-text" : "slot-caption"}>
              {post.caption}
            </p>
          )}
        </article>
      </div>

      {mounted && rect && (
        <TooltipPanel
          posts={[post]}
          anchorRect={rect}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </>
  );
}

// ── SlotCell — entry point used by the page ───────────────────

export function SlotCell({ posts }: { posts: readonly Post[] }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const mounted = usePortalMounted();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setRect(null), HIDE_DELAY_MS);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const handleCellEnter = useCallback(() => {
    cancelHide();
    if (cellRef.current) setRect(cellRef.current.getBoundingClientRect());
  }, [cancelHide]);

  const handleCellLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handlePanelEnter = useCallback(() => {
    cancelHide();
  }, [cancelHide]);

  const handlePanelLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  // Update rect on scroll while open
  useEffect(() => {
    if (!rect) return;
    const update = () => {
      if (cellRef.current) setRect(cellRef.current.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", update, { capture: true });
  }, [rect]);

  if (posts.length === 0) {
    return (
      <div className="slot-empty">
        <span>Add</span>
      </div>
    );
  }

  const sortedPosts = [...posts].sort((a, b) => {
    const parse = (t: string) => {
      const m = t.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
      if (!m) return 0;
      let h = parseInt(m[1]!, 10);
      const min = parseInt(m[2] ?? "0", 10);
      if (m[3]!.toUpperCase() === "AM" && h === 12) h = 0;
      if (m[3]!.toUpperCase() === "PM" && h !== 12) h += 12;
      return h * 60 + min;
    };
    return parse(a.time) - parse(b.time);
  });

  return (
    <>
      <div
        ref={cellRef}
        className={posts.length > 1 ? "slot-stack" : "slot-post-wrapper"}
        onMouseEnter={handleCellEnter}
        onMouseLeave={handleCellLeave}
      >
        {posts.length === 1 ? (
          <article className="slot-post">
            <div className="slot-post-header">
              <span className="slot-platform-icon">
                <PlatformIcon platform={posts[0]!.platform} size={12} />
              </span>
              <span className="slot-time">{posts[0]!.time}</span>
            </div>
            {posts[0]!.type !== "text-only" && posts[0]!.mediaColor && (
              <div className="slot-media-frame" style={{ background: posts[0]!.mediaColor }} />
            )}
            {posts[0]!.caption && (
              <p className={posts[0]!.type === "text-only" ? "slot-caption slot-caption-text" : "slot-caption"}>
                {posts[0]!.caption}
              </p>
            )}
          </article>
        ) : (
          <>
            <div className="slot-stack-icons">
              {sortedPosts.slice(0, 3).map((p, i) => (
                <span key={i} className="slot-stack-icon" style={{ zIndex: posts.length - i }}>
                  <PlatformIcon platform={p.platform} size={12} />
                </span>
              ))}
              {posts.length > 3 && (
                <span className="slot-stack-overflow">+{posts.length - 3}</span>
              )}
            </div>
            <span className="slot-stack-count">{posts.length} posts</span>
          </>
        )}
      </div>

      {mounted && rect && (
        <TooltipPanel
          posts={sortedPosts}
          anchorRect={rect}
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
        />
      )}
    </>
  );
}
