"use client";

import { useState } from "react";
import { scheduleDays, scheduledPosts } from "./scaffold-data";
import { PostCard } from "./post-tooltip";
import type { Post } from "./post-tooltip";

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

function getPostsForDay(day: string, weekOffset: number): Post[] {
  if (weekOffset !== 0) return [];
  return [...(scheduledPosts as unknown as (Post & { day: string })[])
    .filter((p) => p.day === day)]
    .sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function WeeklyCalendar() {
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
          const posts = getPostsForDay(day, weekOffset);

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
