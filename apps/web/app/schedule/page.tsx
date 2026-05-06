import { ProductShell } from "../ui/product-shell";
import { WeeklyCalendar } from "../ui/weekly-calendar";
import { createClient } from "../../lib/supabase/server";
import type { RecommendedSlot, ScheduledPost } from "@brilhio/contracts";

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

function mapRecommendedSlot(row: {
  id: string;
  user_id: string;
  suggested_for: string;
  platform: RecommendedSlot["platform"];
  content_type_hint: string;
  rationale: string | null;
  status: RecommendedSlot["status"];
  scheduled_post_id: string | null;
  created_at: string;
}): RecommendedSlot {
  return {
    id: row.id,
    userId: row.user_id,
    suggestedFor: row.suggested_for,
    platform: row.platform,
    contentTypeHint: row.content_type_hint,
    rationale: row.rationale,
    status: row.status,
    scheduledPostId: row.scheduled_post_id,
    createdAt: row.created_at,
  };
}

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let posts: ScheduledPost[] = [];
  let recommendedSlots: RecommendedSlot[] = [];

  if (user) {
    const [postsResult, slotsResult] = await Promise.all([
      supabase
        .from("scheduled_posts")
        .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
        .eq("user_id", user.id)
        .order("scheduled_for", { ascending: true }),
      supabase
        .from("recommended_slots")
        .select("id, user_id, suggested_for, platform, content_type_hint, rationale, status, scheduled_post_id, created_at")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("suggested_for", { ascending: true }),
    ]);
    posts = (postsResult.data ?? []).map(mapScheduledPost);
    recommendedSlots = (slotsResult.data ?? []).map(mapRecommendedSlot);
  }

  return (
    <ProductShell activePath="/schedule">
      <WeeklyCalendar scheduledPosts={posts} recommendedSlots={recommendedSlots} />
    </ProductShell>
  );
}
