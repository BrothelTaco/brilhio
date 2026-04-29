"use client";

import { useState } from "react";
import { scheduleDays } from "./scaffold-data";
import { PostCard } from "./post-tooltip";
import type { Post } from "./post-tooltip";
import type { ScheduledPost } from "@brilhio/contracts";

const MAX_WEEKS = 4;

function parseMinutes(time: string): number {
  const m = time.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
  if (!m) return 0;
  let h = parseInt(m[1]!, 10);
  const min = parseInt(m[2] ?? "0", 10);
  if (m[3]!.toUpperCase() === "AM" && h === 12) h = 0;
  if (m[3]!.toUpperCase() === "PM" && h !== 12) h += 12;
  return h * 60 + min;
}

function getThisMonday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  today.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  return today;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthRange(start: Date, end: Date): string {
  const sm = start.toLocaleDateString("en-US", { month: "long" });
  const em = end.toLocaleDateString("en-US", { month: "long" });
  const sy = start.getFullYear();
  const ey = end.getFullYear();
  if (sy !== ey) return `${sm} ${sy} — ${em} ${ey}`;
  if (sm !== em) return `${sm} — ${em} ${sy}`;
  return `${sm} ${sy}`;
}

function sameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function postType(post: ScheduledPost): Post["type"] {
  return post.platform === "x" ? "text-only" : "media+caption";
}

function mediaColor(post: ScheduledPost) {
  if (post.platform === "instagram") return "linear-gradient(135deg, #ff7a59, #7c3aed)";
  if (post.platform === "tiktok") return "linear-gradient(135deg, #111827, #06b6d4)";
  if (post.platform === "facebook") return "linear-gradient(135deg, #2563eb, #93c5fd)";
  return null;
}

function getPostsForDay(posts: ScheduledPost[], date: Date): Post[] {
  return posts
    .filter((post) => sameDate(new Date(post.scheduledFor), date))
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
    )
    .map((post) => ({
      platform: post.platform,
      time: formatTime(new Date(post.scheduledFor)),
      type: postType(post),
      mediaColor: mediaColor(post),
      caption: post.platformCaption,
    }));
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function WeeklyCalendar({ scheduledPosts = [] }: { scheduledPosts?: ScheduledPost[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = addDays(getThisMonday(), weekOffset * 7);
  const sunday = addDays(monday, 6);
  const weekDates = scheduleDays.map((_, i) => addDays(monday, i));

  return (
    <section className="calendar-surface">
      <div className="calendar-nav">
        <p className="brilhio-eyebrow">Weekly calendar</p>
        <div className="calendar-nav-controls">
          <span className="calendar-nav-range">{formatMonthRange(monday, sunday)}</span>
          <button
            className="cal-nav-btn"
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            aria-label="Previous week"
          >
            &#8592;
          </button>
          <span className="cal-nav-week">Week {weekOffset + 1} of {MAX_WEEKS}</span>
          <button
            className="cal-nav-btn"
            onClick={() => setWeekOffset((w) => Math.min(MAX_WEEKS - 1, w + 1))}
            disabled={weekOffset === MAX_WEEKS - 1}
            aria-label="Next week"
          >
            &#8594;
          </button>
        </div>
      </div>

      <div className="week-columns">
        {scheduleDays.map((day, i) => {
          const date = weekDates[i]!;
          const today = isToday(date);
          const posts = getPostsForDay(scheduledPosts, date);

          return (
            <div key={day} className={`day-column ${today ? "day-column-today" : ""}`}>
              <div className="day-column-head">
                <strong className="day-column-name">{day}</strong>
                <span className="day-column-date">{formatDate(date)}</span>
              </div>

              <div className="day-posts">
                {posts.length > 0 ? (
                  posts.map((post, j) => (
                    <PostCard key={`${day}-${j}`} post={post} />
                  ))
                ) : (
                  <p className="day-empty">No posts scheduled</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
