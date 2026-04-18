import type { ScheduledPost } from "@ritmio/contracts";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function getWeekdayLabel(iso: string) {
  return dayFormatter.format(new Date(iso));
}

export function formatScheduleTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

export function groupScheduledPostsByDay(posts: ScheduledPost[]) {
  const grouped = new Map<string, ScheduledPost[]>();

  for (const post of posts) {
    const day = getWeekdayLabel(post.scheduledFor);
    const current = grouped.get(day) ?? [];
    current.push(post);
    grouped.set(day, current);
  }

  return Array.from(grouped.entries()).map(([day, items]) => ({
    day,
    items: items.sort((left, right) =>
      left.scheduledFor.localeCompare(right.scheduledFor),
    ),
  }));
}

export function getNextOpenWindow(posts: ScheduledPost[]) {
  if (posts.length === 0) {
    return "Today, 9:00 AM";
  }

  const sorted = [...posts].sort((left, right) =>
    left.scheduledFor.localeCompare(right.scheduledFor),
  );
  const last = sorted.at(-1);

  if (!last) {
    return "Today, 9:00 AM";
  }

  const date = new Date(last.scheduledFor);
  date.setHours(date.getHours() + 4);

  return `${dayFormatter.format(date)}, ${timeFormatter.format(date)}`;
}
