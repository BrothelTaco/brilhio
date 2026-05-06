import type {
  AssetKind,
  Platform,
  PostStatus,
  UserStrategyProfile,
} from "@brilhio/contracts";
import type { Repository } from "../types";

const DEFAULT_RECENT_POSTS = 8;
const DEFAULT_RECENT_MEDIA = 8;

export type UserContextRecentPost = {
  platform: Platform;
  scheduledFor: string;
  status: PostStatus;
  caption: string;
  contentTitle: string;
};

export type UserContextMediaSummary = {
  totalAssets: number;
  recentAssets: Array<{
    kind: AssetKind;
    title: string;
    altText: string | null;
    createdAt: string;
  }>;
};

export type UserContextConnectedAccount = {
  platform: Platform;
  handle: string;
  audienceLabel: string;
};

export type UserContext = {
  userId: string;
  generatedAt: string;
  strategy: UserStrategyProfile;
  brandBrief: string | null;
  connectedAccounts: UserContextConnectedAccount[];
  recentPosts: UserContextRecentPost[];
  media: UserContextMediaSummary;
};

export type BuildUserContextOptions = {
  recentPostsLimit?: number;
  recentMediaLimit?: number;
};

export async function buildUserContext(
  repository: Repository,
  userId: string,
  options: BuildUserContextOptions = {},
): Promise<UserContext> {
  const recentPostsLimit = options.recentPostsLimit ?? DEFAULT_RECENT_POSTS;
  const recentMediaLimit = options.recentMediaLimit ?? DEFAULT_RECENT_MEDIA;

  const [strategy, dashboard] = await Promise.all([
    repository.getUserStrategyProfile(userId),
    repository.getDashboard(userId),
  ]);

  const contentItemsById = new Map(
    dashboard.contentItems.map((item) => [item.id, item]),
  );

  const recentPosts: UserContextRecentPost[] = [...dashboard.scheduledPosts]
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
    .slice(0, recentPostsLimit)
    .map((post) => ({
      platform: post.platform,
      scheduledFor: post.scheduledFor,
      status: post.status,
      caption: post.platformCaption,
      contentTitle: contentItemsById.get(post.contentItemId)?.title ?? "Untitled",
    }));

  const recentAssets = [...dashboard.mediaAssets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, recentMediaLimit)
    .map((asset) => ({
      kind: asset.kind,
      title: asset.title,
      altText: asset.altText,
      createdAt: asset.createdAt,
    }));

  const connectedAccounts = dashboard.socialAccounts
    .filter((account) => account.status === "connected")
    .map((account) => ({
      platform: account.platform,
      handle: account.handle,
      audienceLabel: account.audienceLabel,
    }));

  return {
    userId,
    generatedAt: new Date().toISOString(),
    strategy,
    brandBrief: strategy.brandBrief,
    connectedAccounts,
    recentPosts,
    media: {
      totalAssets: dashboard.mediaAssets.length,
      recentAssets,
    },
  };
}

function bullet(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- (none)";
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function renderUserContextPrompt(context: UserContext): string {
  const { strategy, connectedAccounts, recentPosts, media, brandBrief } = context;

  const platformPriorities = Object.entries(strategy.platformPriorities)
    .map(([platform, priority]) => `${platform}: ${priority}`);

  const accountLines = connectedAccounts.map(
    (account) => `${account.platform} (${account.handle}) — ${account.audienceLabel}`,
  );

  const postLines = recentPosts.map(
    (post) =>
      `[${fmtDate(post.scheduledFor)} · ${post.platform} · ${post.status}] ${post.contentTitle} — "${post.caption}"`,
  );

  const mediaLines = media.recentAssets.map(
    (asset) => `${asset.kind}: "${asset.title}"${asset.altText ? ` — ${asset.altText}` : ""}`,
  );

  const sections = [
    "# About this user",
    bullet([
      `Industry: ${strategy.industry ?? "(not set)"}`,
      `Identity: ${strategy.identityType ?? "(not set)"}`,
      `Goals: ${strategy.goals.join(", ") || "(not set)"}`,
      `Voice: ${strategy.voiceAttributes.join(", ") || "(not set)"}`,
      `Content pillars: ${strategy.contentPillars.join(", ") || "(not set)"}`,
      `Platform priorities: ${platformPriorities.join("; ") || "(not set)"}`,
      `Audience notes: ${strategy.audienceNotes ?? "(not set)"}`,
    ]),
    "",
    "# Brand brief",
    brandBrief?.trim() || "(not yet generated)",
    "",
    "# Connected platforms",
    bullet(accountLines),
    "",
    `# Recent posts (most recent ${recentPosts.length})`,
    bullet(postLines),
    "",
    `# Media library (${media.totalAssets} assets, showing ${media.recentAssets.length} most recent)`,
    bullet(mediaLines),
  ];

  return sections.join("\n");
}
