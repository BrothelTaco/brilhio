import { ProductShell } from "../ui/product-shell";
import { WeeklyCalendar } from "../ui/weekly-calendar";
import { createClient } from "../../lib/supabase/server";
import type { ScheduledPost } from "@brilhio/contracts";

function mapScheduledPost(row: {
  id: string;
  user_id: string;
  content_item_id: string;
  platform: ScheduledPost["platform"];
  scheduled_for: string;
  status: ScheduledPost["status"];
  platform_caption: string;
  publish_window_label: string;
  provider_post_id: string | null;
  error_message: string | null;
}): ScheduledPost {
  return {
    id: row.id,
    userId: row.user_id,
    contentItemId: row.content_item_id,
    platform: row.platform,
    scheduledFor: row.scheduled_for,
    status: row.status,
    platformCaption: row.platform_caption,
    publishWindowLabel: row.publish_window_label,
    providerPostId: row.provider_post_id,
    errorMessage: row.error_message,
  };
}

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let posts: ScheduledPost[] = [];

  if (user) {
    const { data } = await supabase
      .from("scheduled_posts")
      .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
      .eq("user_id", user.id)
      .order("scheduled_for", { ascending: true });
    posts = (data ?? []).map(mapScheduledPost);
  }

  return (
    <ProductShell activePath="/schedule">
      <WeeklyCalendar scheduledPosts={posts} />
    </ProductShell>
  );
}
