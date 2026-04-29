import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AiSuggestion,
  ApprovalStatus,
  ApprovalTask,
  AuthSession,
  AuthenticatedUser,
  ContentItem,
  CreateApprovalTaskInput,
  CreateContentItemInput,
  CreateMediaAssetInput,
  DashboardSnapshot,
  JobRecord,
  MediaAsset,
  Platform,
  QueueJobInput,
  ScheduledPost,
  SchedulePostInput,
  SocialAccount,
  UpdateUserStrategyProfileInput,
  UserStrategyProfile,
} from "@brilhio/contracts";
import {
  demoAiSuggestions,
  demoApprovalTasks,
  demoAuthSession,
  demoContentItems,
  demoDashboardSnapshot,
  demoJobs,
  demoMediaAssets,
  demoProfile,
  demoScheduledPosts,
  demoSocialAccounts,
} from "@brilhio/utils";
import { decryptSecret, encryptSecret } from "./crypto";
import type {
  BillingProfileUpdate,
  CreateAiSuggestionParams,
  JobRecordUpdate,
  Repository,
  UpsertSocialAccountConnectionInput,
} from "./types";

function makeId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function ensureDateString(value: string | null | undefined) {
  return value ?? new Date().toISOString();
}

function firstNameFromEmail(email: string | null) {
  if (!email) return "Brilhio";
  const [candidate] = email.split("@");
  return candidate ? candidate.replace(/[._-]+/g, " ") : "Brilhio";
}

function emptyStrategyProfile(userId: string): UserStrategyProfile {
  return {
    userId,
    identityType: null,
    goals: [],
    voiceAttributes: [],
    platformPriorities: {},
    contentPillars: [],
    audienceNotes: null,
    updatedAt: new Date().toISOString(),
  };
}

function mapStrategyProfile(row: {
  user_id: string;
  identity_type: string | null;
  goals: string[] | null;
  voice_attributes: string[] | null;
  platform_priorities: Record<string, string> | null;
  content_pillars: string[] | null;
  audience_notes: string | null;
  updated_at: string;
}): UserStrategyProfile {
  return {
    userId: row.user_id,
    identityType: row.identity_type,
    goals: row.goals ?? [],
    voiceAttributes: row.voice_attributes ?? [],
    platformPriorities: row.platform_priorities ?? {},
    contentPillars: row.content_pillars ?? [],
    audienceNotes: row.audience_notes,
    updatedAt: row.updated_at,
  };
}

function mapMediaAsset(row: {
  id: string;
  user_id: string;
  kind: MediaAsset["kind"];
  title: string;
  storage_path: string;
  alt_text: string | null;
  duration_seconds: number | null;
  created_at: string;
}): MediaAsset {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    storagePath: row.storage_path,
    altText: row.alt_text,
    durationSeconds: row.duration_seconds,
    createdAt: ensureDateString(row.created_at),
  };
}

function mapContentItem(
  row: {
    id: string;
    user_id: string;
    title: string;
    brief: string;
    campaign: string;
    stage: ContentItem["stage"];
    primary_caption: string;
    created_at: string;
  },
  mediaAssetIds: string[],
): ContentItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    brief: row.brief,
    campaign: row.campaign,
    stage: row.stage,
    mediaAssetIds,
    primaryCaption: row.primary_caption,
    createdAt: ensureDateString(row.created_at),
  };
}

function mapSocialAccount(row: {
  id: string;
  user_id: string;
  platform: Platform;
  handle: string;
  status: SocialAccount["status"];
  audience_label: string;
  token_expires_at: string | null;
  provider_metadata?: Record<string, unknown> | null;
}): SocialAccount {
  const metadata = row.provider_metadata ?? {};
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    handle: row.handle,
    status: row.status,
    audienceLabel: row.audience_label,
    tokenExpiresAt: row.token_expires_at,
    providerAccountId: typeof metadata.providerAccountId === "string" ? metadata.providerAccountId : null,
    providerAccountUrn: typeof metadata.providerAccountUrn === "string" ? metadata.providerAccountUrn : null,
    profileUrl: typeof metadata.profileUrl === "string" ? metadata.profileUrl : null,
  };
}

function mapScheduledPost(row: {
  id: string;
  user_id: string;
  content_item_id: string;
  platform: Platform;
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

function mapAiSuggestion(row: {
  id: string;
  user_id: string;
  content_item_id: string;
  suggestion_type: AiSuggestion["type"];
  title: string;
  body: string;
  created_at: string;
}): AiSuggestion {
  return {
    id: row.id,
    userId: row.user_id,
    contentItemId: row.content_item_id,
    type: row.suggestion_type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapApprovalTask(row: {
  id: string;
  user_id: string;
  content_item_id: string;
  reviewer_user_id: string | null;
  reviewer_name: string;
  due_at: string;
  status: ApprovalTask["status"];
  note: string;
}): ApprovalTask {
  return {
    id: row.id,
    userId: row.user_id,
    contentItemId: row.content_item_id,
    reviewerUserId: row.reviewer_user_id,
    reviewerName: row.reviewer_name,
    dueAt: row.due_at,
    status: row.status,
    note: row.note,
  };
}

function mapJobRecord(row: {
  id: string;
  user_id: string;
  type: JobRecord["type"];
  status: JobRecord["status"];
  target_table: JobRecord["targetTable"];
  target_id: string;
  attempt_count: number;
  scheduled_for: string;
  created_at: string;
  bullmq_job_id: string | null;
  last_error: string | null;
  payload: Record<string, unknown> | null;
}): JobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    targetTable: row.target_table,
    targetId: row.target_id,
    attemptCount: row.attempt_count,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    bullmqJobId: row.bullmq_job_id,
    lastError: row.last_error,
    payload: row.payload ?? {},
  };
}

// ============================================================
// MemoryRepository — used in development without Supabase
// ============================================================

export class MemoryRepository implements Repository {
  mode = "memory" as const;

  private session = structuredClone(demoAuthSession);
  private mediaAssets = structuredClone(demoMediaAssets);
  private contentItems = structuredClone(demoContentItems);
  private socialAccounts = structuredClone(demoSocialAccounts);
  private scheduledPosts = structuredClone(demoScheduledPosts);
  private aiSuggestions = structuredClone(demoAiSuggestions);
  private approvalTasks = structuredClone(demoApprovalTasks);
  private jobs = structuredClone(demoJobs);
  private strategyProfiles = new Map<string, UserStrategyProfile>();
  private billingProfiles = new Map<string, BillingProfileUpdate>();

  async getAuthSession(user: AuthenticatedUser): Promise<AuthSession> {
    return {
      user,
      profile: {
        ...structuredClone(demoProfile),
        userId: user.id,
        email: user.email ?? demoProfile.email,
      },
    };
  }

  async updateUserTimezone(userId: string, timezone: string): Promise<void> {
    if (this.session.profile.userId === userId) {
      this.session.profile.timezone = timezone;
    }
  }

  async getUserTimezone(userId: string): Promise<string> {
    if (this.session.profile.userId === userId) {
      return this.session.profile.timezone;
    }
    return "UTC";
  }

  async getUserStrategyProfile(userId: string): Promise<UserStrategyProfile> {
    return structuredClone(this.strategyProfiles.get(userId) ?? emptyStrategyProfile(userId));
  }

  async updateUserStrategyProfile(
    userId: string,
    input: UpdateUserStrategyProfileInput,
  ): Promise<UserStrategyProfile> {
    const updated: UserStrategyProfile = {
      userId,
      identityType: input.identityType,
      goals: input.goals,
      voiceAttributes: input.voiceAttributes,
      platformPriorities: input.platformPriorities,
      contentPillars: input.contentPillars,
      audienceNotes: input.audienceNotes,
      updatedAt: new Date().toISOString(),
    };
    this.strategyProfiles.set(userId, updated);
    return structuredClone(updated);
  }

  async ensureStripeCustomerId(userId: string, _email: string | null, stripeCustomerId: string) {
    if (this.session.profile.userId === userId) {
      this.session.profile.stripeCustomerId = stripeCustomerId;
    }
    this.billingProfiles.set(userId, {
      ...(this.billingProfiles.get(userId) ?? {}),
      stripeCustomerId,
    });
  }

  async updateBillingProfileByUserId(userId: string, update: BillingProfileUpdate) {
    this.billingProfiles.set(userId, {
      ...(this.billingProfiles.get(userId) ?? {}),
      ...update,
    });
    if (this.session.profile.userId === userId) {
      Object.assign(this.session.profile, update);
    }
  }

  async updateBillingProfileByStripeCustomerId(stripeCustomerId: string, update: BillingProfileUpdate) {
    const found = [...this.billingProfiles.entries()].find(
      ([, profile]) => profile.stripeCustomerId === stripeCustomerId,
    );
    if (found) {
      await this.updateBillingProfileByUserId(found[0], update);
    }
  }

  async userHasActiveSubscription(userId: string) {
    const status =
      this.billingProfiles.get(userId)?.subscriptionStatus ??
      (this.session.profile.userId === userId ? this.session.profile.subscriptionStatus : null);
    return status === "active" || status === "trialing";
  }

  async listOverdueJobRecords(): Promise<JobRecord[]> {
    const now = new Date().toISOString();
    return this.jobs.filter(
      (job) => job.status === "queued" && job.scheduledFor <= now,
    );
  }

  async getDashboard(_userId: string): Promise<DashboardSnapshot> {
    return {
      socialAccounts: structuredClone(this.socialAccounts),
      mediaAssets: structuredClone(this.mediaAssets),
      contentItems: structuredClone(this.contentItems),
      scheduledPosts: structuredClone(this.scheduledPosts),
      aiSuggestions: structuredClone(this.aiSuggestions),
      approvalTasks: structuredClone(this.approvalTasks),
      jobs: structuredClone(this.jobs),
    };
  }

  async listMediaAssets(userId: string) {
    return this.mediaAssets.filter((asset) => asset.userId === userId);
  }

  async createMediaAsset(input: CreateMediaAssetInput) {
    const created: MediaAsset = {
      id: makeId("asset"),
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      storagePath: input.storagePath,
      altText: input.altText ?? null,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: new Date().toISOString(),
    };
    this.mediaAssets.unshift(created);
    return created;
  }

  async createContentItem(input: CreateContentItemInput) {
    const created: ContentItem = {
      id: makeId("content"),
      userId: input.userId,
      title: input.title,
      brief: input.brief,
      campaign: input.campaign,
      stage: "draft",
      mediaAssetIds: input.mediaAssetIds,
      primaryCaption: input.primaryCaption,
      createdAt: new Date().toISOString(),
    };
    this.contentItems.unshift(created);
    return created;
  }

  async createApprovalTask(input: CreateApprovalTaskInput) {
    const created: ApprovalTask = {
      id: makeId("approval"),
      userId: input.userId,
      contentItemId: input.contentItemId,
      reviewerUserId: input.reviewerUserId,
      reviewerName: input.reviewerName,
      dueAt: input.dueAt,
      status: "pending",
      note: input.note,
    };
    this.approvalTasks.unshift(created);
    return created;
  }

  async updateApprovalTaskStatus(userId: string, approvalTaskId: string, status: ApprovalStatus) {
    const found = this.approvalTasks.find(
      (task) => task.userId === userId && task.id === approvalTaskId,
    );
    if (!found) return null;
    found.status = status;
    return structuredClone(found);
  }

  async createScheduledPost(input: SchedulePostInput) {
    const created: ScheduledPost = {
      id: makeId("post"),
      userId: input.userId,
      contentItemId: input.contentItemId,
      platform: input.platform,
      scheduledFor: input.scheduledFor,
      status: "scheduled",
      platformCaption: input.platformCaption,
      publishWindowLabel: input.publishWindowLabel,
      providerPostId: null,
      errorMessage: null,
    };
    this.scheduledPosts.push(created);
    return created;
  }

  async createJobRecord(input: QueueJobInput) {
    const created: JobRecord = {
      id: makeId("job"),
      userId: input.userId,
      type: input.type,
      status: "queued",
      targetTable: input.targetTable,
      targetId: input.targetId,
      attemptCount: 0,
      scheduledFor: input.scheduledFor,
      createdAt: new Date().toISOString(),
      bullmqJobId: null,
      lastError: null,
      payload: input.payload,
    };
    this.jobs.unshift(created);
    return created;
  }

  async attachBullmqJobId(jobRecordId: string, bullmqJobId: string) {
    const found = this.jobs.find((job) => job.id === jobRecordId);
    if (!found) return null;
    found.bullmqJobId = bullmqJobId;
    return structuredClone(found);
  }

  async getJobRecord(jobRecordId: string) {
    return this.jobs.find((job) => job.id === jobRecordId) ?? null;
  }

  async updateJobRecord(jobRecordId: string, update: JobRecordUpdate) {
    const found = this.jobs.find((job) => job.id === jobRecordId);
    if (!found) return null;
    Object.assign(found, update);
    return structuredClone(found);
  }

  async createAiSuggestion(input: CreateAiSuggestionParams) {
    this.aiSuggestions.unshift({
      id: makeId("suggestion"),
      userId: input.userId,
      contentItemId: input.contentItemId,
      type: input.type,
      title: input.title,
      body: input.body,
      createdAt: new Date().toISOString(),
    });
  }

  async getContentItem(contentItemId: string) {
    return this.contentItems.find((item) => item.id === contentItemId) ?? null;
  }

  async getScheduledPost(scheduledPostId: string) {
    return this.scheduledPosts.find((post) => post.id === scheduledPostId) ?? null;
  }

  async getSocialAccount(userId: string, platform: Platform) {
    return (
      this.socialAccounts.find(
        (account) => account.userId === userId && account.platform === platform,
      ) ?? null
    );
  }

  async getSocialAccountById(socialAccountId: string) {
    return this.socialAccounts.find((account) => account.id === socialAccountId) ?? null;
  }

  async getSocialAccountCredentials(userId: string, platform: Platform) {
    const account = this.socialAccounts.find(
      (a) => a.userId === userId && a.platform === platform,
    );
    if (!account) return null;
    return {
      accessToken: `memory-${platform}-token`,
      refreshToken: null,
      providerMetadata: {
        providerAccountId: account.providerAccountId ?? null,
        providerAccountUrn: account.providerAccountUrn ?? null,
        profileUrl: account.profileUrl ?? null,
        publishMode: "sandbox",
      },
    };
  }

  async upsertSocialAccountConnection(input: UpsertSocialAccountConnectionInput) {
    const existing = this.socialAccounts.find(
      (account) => account.userId === input.userId && account.platform === input.platform,
    );

    if (existing) {
      existing.handle = input.handle;
      existing.audienceLabel = input.audienceLabel;
      existing.status = "connected";
      existing.tokenExpiresAt = input.tokenExpiresAt ?? null;
      existing.providerAccountId = input.providerAccountId ?? null;
      existing.profileUrl = input.profileUrl ?? null;
      return structuredClone(existing);
    }

    const created: SocialAccount = {
      id: makeId("account"),
      userId: input.userId,
      platform: input.platform,
      handle: input.handle,
      status: "connected",
      audienceLabel: input.audienceLabel,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      providerAccountId: input.providerAccountId ?? null,
      providerAccountUrn: null,
      profileUrl: input.profileUrl ?? null,
    };
    this.socialAccounts.unshift(created);
    return created;
  }

  async markScheduledPostPublished(scheduledPostId: string, providerPostId: string) {
    const found = this.scheduledPosts.find((post) => post.id === scheduledPostId);
    if (!found) return null;
    found.status = "published";
    found.providerPostId = providerPostId;
    found.errorMessage = null;
    return structuredClone(found);
  }

  async markScheduledPostFailed(scheduledPostId: string, errorMessage: string) {
    const found = this.scheduledPosts.find((post) => post.id === scheduledPostId);
    if (!found) return null;
    found.status = "failed";
    found.errorMessage = errorMessage;
    return structuredClone(found);
  }
}

// ============================================================
// SupabaseRepository — production
// ============================================================

export class SupabaseRepository implements Repository {
  mode = "supabase" as const;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly encryptionSecret: string,
  ) {}

  static create(config: {
    supabaseUrl: string;
    serviceRoleKey: string;
    encryptionSecret: string;
  }) {
    const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return new SupabaseRepository(client, config.encryptionSecret);
  }

  async getAuthSession(user: AuthenticatedUser): Promise<AuthSession> {
    const { data: profileRow, error } = await this.supabase
      .from("profiles")
      .select("id, user_id, email, timezone, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!profileRow) {
      return {
        user,
        profile: {
          id: "pending",
          userId: user.id,
          email: user.email ?? "",
          timezone: "UTC",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          subscriptionCurrentPeriodEnd: null,
          subscriptionCancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
        },
      };
    }

    return {
      user,
      profile: {
        id: profileRow.id,
        userId: profileRow.user_id,
        email: profileRow.email,
        timezone: profileRow.timezone ?? "UTC",
        stripeCustomerId: profileRow.stripe_customer_id ?? null,
        stripeSubscriptionId: profileRow.stripe_subscription_id ?? null,
        subscriptionStatus: profileRow.subscription_status ?? null,
        subscriptionCurrentPeriodEnd: profileRow.subscription_current_period_end ?? null,
        subscriptionCancelAtPeriodEnd: profileRow.subscription_cancel_at_period_end ?? false,
        createdAt: profileRow.created_at,
      },
    };
  }

  async updateUserTimezone(userId: string, timezone: string): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .update({ timezone })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  async getUserTimezone(userId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.timezone ?? "UTC";
  }

  async getUserStrategyProfile(userId: string): Promise<UserStrategyProfile> {
    const { data, error } = await this.supabase
      .from("user_strategy_profiles")
      .select("user_id, identity_type, goals, voice_attributes, platform_priorities, content_pillars, audience_notes, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapStrategyProfile(data) : emptyStrategyProfile(userId);
  }

  async updateUserStrategyProfile(
    userId: string,
    input: UpdateUserStrategyProfileInput,
  ): Promise<UserStrategyProfile> {
    const { data, error } = await this.supabase
      .from("user_strategy_profiles")
      .upsert({
        user_id: userId,
        identity_type: input.identityType,
        goals: input.goals,
        voice_attributes: input.voiceAttributes,
        platform_priorities: input.platformPriorities,
        content_pillars: input.contentPillars,
        audience_notes: input.audienceNotes,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("user_id, identity_type, goals, voice_attributes, platform_priorities, content_pillars, audience_notes, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return mapStrategyProfile(data);
  }

  async ensureStripeCustomerId(userId: string, email: string | null, stripeCustomerId: string) {
    const { error } = await this.supabase
      .from("profiles")
      .upsert({
        user_id: userId,
        email: email ?? "",
        stripe_customer_id: stripeCustomerId,
      }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }

  private billingPatch(update: BillingProfileUpdate) {
    const patch: Record<string, unknown> = {};
    if (update.stripeCustomerId !== undefined) patch.stripe_customer_id = update.stripeCustomerId;
    if (update.stripeSubscriptionId !== undefined) patch.stripe_subscription_id = update.stripeSubscriptionId;
    if (update.subscriptionStatus !== undefined) patch.subscription_status = update.subscriptionStatus;
    if (update.subscriptionCurrentPeriodEnd !== undefined) {
      patch.subscription_current_period_end = update.subscriptionCurrentPeriodEnd;
    }
    if (update.subscriptionCancelAtPeriodEnd !== undefined) {
      patch.subscription_cancel_at_period_end = update.subscriptionCancelAtPeriodEnd;
    }
    return patch;
  }

  async updateBillingProfileByUserId(userId: string, update: BillingProfileUpdate) {
    const { error } = await this.supabase
      .from("profiles")
      .update(this.billingPatch(update))
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  async updateBillingProfileByStripeCustomerId(
    stripeCustomerId: string,
    update: BillingProfileUpdate,
  ) {
    const { error } = await this.supabase
      .from("profiles")
      .update(this.billingPatch(update))
      .eq("stripe_customer_id", stripeCustomerId);
    if (error) throw new Error(error.message);
  }

  async userHasActiveSubscription(userId: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("subscription_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.subscription_status === "active" || data?.subscription_status === "trialing";
  }

  async listOverdueJobRecords(): Promise<JobRecord[]> {
    const { data, error } = await this.supabase
      .from("job_records")
      .select("id, user_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .is("bullmq_job_id", null);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapJobRecord);
  }

  async getDashboard(userId: string): Promise<DashboardSnapshot> {
    const [
      socialAccountsResult,
      mediaAssetsResult,
      contentItemsResult,
      contentItemMediaResult,
      scheduledPostsResult,
      aiSuggestionsResult,
      approvalTasksResult,
      jobsResult,
    ] = await Promise.all([
      this.supabase
        .from("social_accounts")
        .select("id, user_id, platform, handle, status, audience_label, token_expires_at, provider_metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("media_assets")
        .select("id, user_id, kind, title, storage_path, alt_text, duration_seconds, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("content_items")
        .select("id, user_id, title, brief, campaign, stage, primary_caption, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("content_item_media")
        .select("content_item_id, media_asset_id, sort_order")
        .order("sort_order", { ascending: true }),
      this.supabase
        .from("scheduled_posts")
        .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
        .eq("user_id", userId)
        .order("scheduled_for", { ascending: true }),
      this.supabase
        .from("ai_suggestions")
        .select("id, user_id, content_item_id, suggestion_type, title, body, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("approval_tasks")
        .select("id, user_id, content_item_id, reviewer_user_id, reviewer_name, due_at, status, note")
        .eq("user_id", userId)
        .order("due_at", { ascending: true }),
      this.supabase
        .from("job_records")
        .select("id, user_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    for (const result of [
      socialAccountsResult, mediaAssetsResult, contentItemsResult,
      contentItemMediaResult, scheduledPostsResult, aiSuggestionsResult,
      approvalTasksResult, jobsResult,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }

    const mediaByContentId = new Map<string, string[]>();
    for (const row of contentItemMediaResult.data ?? []) {
      const current = mediaByContentId.get(row.content_item_id) ?? [];
      current.push(row.media_asset_id);
      mediaByContentId.set(row.content_item_id, current);
    }

    return {
      socialAccounts: (socialAccountsResult.data ?? []).map(mapSocialAccount),
      mediaAssets: (mediaAssetsResult.data ?? []).map(mapMediaAsset),
      contentItems: (contentItemsResult.data ?? []).map((row) =>
        mapContentItem(row, mediaByContentId.get(row.id) ?? []),
      ),
      scheduledPosts: (scheduledPostsResult.data ?? []).map(mapScheduledPost),
      aiSuggestions: (aiSuggestionsResult.data ?? []).map(mapAiSuggestion),
      approvalTasks: (approvalTasksResult.data ?? []).map(mapApprovalTask),
      jobs: (jobsResult.data ?? []).map(mapJobRecord),
    };
  }

  async listMediaAssets(userId: string) {
    const { data, error } = await this.supabase
      .from("media_assets")
      .select("id, user_id, kind, title, storage_path, alt_text, duration_seconds, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMediaAsset);
  }

  async createMediaAsset(input: CreateMediaAssetInput) {
    const { data, error } = await this.supabase
      .from("media_assets")
      .insert({
        user_id: input.userId,
        kind: input.kind,
        title: input.title,
        storage_path: input.storagePath,
        alt_text: input.altText,
        duration_seconds: input.durationSeconds,
      })
      .select("id, user_id, kind, title, storage_path, alt_text, duration_seconds, created_at")
      .single();
    if (error) throw new Error(error.message);
    return mapMediaAsset(data);
  }

  async createContentItem(input: CreateContentItemInput) {
    const { data, error } = await this.supabase
      .from("content_items")
      .insert({
        user_id: input.userId,
        title: input.title,
        brief: input.brief,
        campaign: input.campaign,
        primary_caption: input.primaryCaption,
      })
      .select("id, user_id, title, brief, campaign, stage, primary_caption, created_at")
      .single();
    if (error) throw new Error(error.message);

    if (input.mediaAssetIds.length > 0) {
      const { error: relationError } = await this.supabase
        .from("content_item_media")
        .insert(
          input.mediaAssetIds.map((mediaAssetId, index) => ({
            content_item_id: data.id,
            media_asset_id: mediaAssetId,
            sort_order: index,
          })),
        );
      if (relationError) throw new Error(relationError.message);
    }

    return mapContentItem(data, input.mediaAssetIds);
  }

  async createApprovalTask(input: CreateApprovalTaskInput) {
    const { data, error } = await this.supabase
      .from("approval_tasks")
      .insert({
        user_id: input.userId,
        content_item_id: input.contentItemId,
        reviewer_user_id: input.reviewerUserId,
        reviewer_name: input.reviewerName,
        due_at: input.dueAt,
        note: input.note,
      })
      .select("id, user_id, content_item_id, reviewer_user_id, reviewer_name, due_at, status, note")
      .single();
    if (error) throw new Error(error.message);
    return mapApprovalTask(data);
  }

  async updateApprovalTaskStatus(userId: string, approvalTaskId: string, status: ApprovalStatus) {
    const { data, error } = await this.supabase
      .from("approval_tasks")
      .update({ status })
      .eq("user_id", userId)
      .eq("id", approvalTaskId)
      .select("id, user_id, content_item_id, reviewer_user_id, reviewer_name, due_at, status, note")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapApprovalTask(data) : null;
  }

  async createScheduledPost(input: SchedulePostInput) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .insert({
        user_id: input.userId,
        content_item_id: input.contentItemId,
        platform: input.platform,
        scheduled_for: input.scheduledFor,
        platform_caption: input.platformCaption,
        publish_window_label: input.publishWindowLabel,
        status: "scheduled",
      })
      .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
      .single();
    if (error) throw new Error(error.message);
    return mapScheduledPost(data);
  }

  async createJobRecord(input: QueueJobInput) {
    const { data, error } = await this.supabase
      .from("job_records")
      .insert({
        user_id: input.userId,
        type: input.type,
        target_table: input.targetTable,
        target_id: input.targetId,
        scheduled_for: input.scheduledFor,
        payload: input.payload,
      })
      .select("id, user_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload")
      .single();
    if (error) throw new Error(error.message);
    return mapJobRecord(data);
  }

  async attachBullmqJobId(jobRecordId: string, bullmqJobId: string) {
    const { data, error } = await this.supabase
      .from("job_records")
      .update({ bullmq_job_id: bullmqJobId })
      .eq("id", jobRecordId)
      .select("id, user_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapJobRecord(data) : null;
  }

  async getJobRecord(jobRecordId: string) {
    const { data, error } = await this.supabase
      .from("job_records")
      .select("id, user_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload")
      .eq("id", jobRecordId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapJobRecord(data) : null;
  }

  async updateJobRecord(jobRecordId: string, update: JobRecordUpdate) {
    const patch: Record<string, unknown> = {};
    if (update.status) patch.status = update.status;
    if (typeof update.attemptCount === "number") patch.attempt_count = update.attemptCount;
    if (update.lastError !== undefined) patch.last_error = update.lastError;
    if (update.bullmqJobId !== undefined) patch.bullmq_job_id = update.bullmqJobId;

    const { data, error } = await this.supabase
      .from("job_records")
      .update(patch)
      .eq("id", jobRecordId)
      .select("id, user_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapJobRecord(data) : null;
  }

  async createAiSuggestion(input: CreateAiSuggestionParams) {
    const { error } = await this.supabase.from("ai_suggestions").insert({
      user_id: input.userId,
      content_item_id: input.contentItemId,
      suggestion_type: input.type,
      title: input.title,
      body: input.body,
      model_name: input.modelName,
      source_job_id: input.sourceJobId,
    });
    if (error) throw new Error(error.message);
  }

  async getContentItem(contentItemId: string) {
    const { data, error } = await this.supabase
      .from("content_items")
      .select("id, user_id, title, brief, campaign, stage, primary_caption, created_at")
      .eq("id", contentItemId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const { data: mediaRows, error: mediaError } = await this.supabase
      .from("content_item_media")
      .select("media_asset_id, sort_order")
      .eq("content_item_id", contentItemId)
      .order("sort_order", { ascending: true });
    if (mediaError) throw new Error(mediaError.message);

    return mapContentItem(data, (mediaRows ?? []).map((row) => row.media_asset_id));
  }

  async getScheduledPost(scheduledPostId: string) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
      .eq("id", scheduledPostId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapScheduledPost(data) : null;
  }

  async getSocialAccount(userId: string, platform: Platform) {
    const { data, error } = await this.supabase
      .from("social_accounts")
      .select("id, user_id, platform, handle, status, audience_label, token_expires_at, provider_metadata")
      .eq("user_id", userId)
      .eq("platform", platform)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSocialAccount(data) : null;
  }

  async getSocialAccountById(socialAccountId: string) {
    const { data, error } = await this.supabase
      .from("social_accounts")
      .select("id, user_id, platform, handle, status, audience_label, token_expires_at, provider_metadata")
      .eq("id", socialAccountId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSocialAccount(data) : null;
  }

  async upsertSocialAccountConnection(input: UpsertSocialAccountConnectionInput) {
    const encryptedAccessToken = encryptSecret(input.accessToken ?? "", this.encryptionSecret);
    const encryptedRefreshToken = input.refreshToken
      ? encryptSecret(input.refreshToken, this.encryptionSecret)
      : null;

    const providerMetadata = {
      providerAccountId: input.providerAccountId ?? null,
      profileUrl: input.profileUrl ?? null,
      ...(input.providerMetadata ?? {}),
    };

    const { data: existing, error: existingError } = await this.supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", input.userId)
      .eq("platform", input.platform)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const mutation = existing?.id
      ? this.supabase
          .from("social_accounts")
          .update({
            handle: input.handle,
            audience_label: input.audienceLabel,
            status: "connected",
            access_token_encrypted: input.accessToken ? encryptedAccessToken : null,
            refresh_token_encrypted: encryptedRefreshToken,
            token_expires_at: input.tokenExpiresAt,
            provider_metadata: providerMetadata,
          })
          .eq("id", existing.id)
      : this.supabase.from("social_accounts").insert({
          user_id: input.userId,
          platform: input.platform,
          handle: input.handle,
          status: "connected",
          audience_label: input.audienceLabel,
          access_token_encrypted: input.accessToken ? encryptedAccessToken : null,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: input.tokenExpiresAt,
          provider_metadata: providerMetadata,
        });

    const { data, error } = await mutation
      .select("id, user_id, platform, handle, status, audience_label, token_expires_at, provider_metadata")
      .single();
    if (error) throw new Error(error.message);
    return mapSocialAccount(data);
  }

  async markScheduledPostPublished(scheduledPostId: string, providerPostId: string) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .update({ status: "published", provider_post_id: providerPostId, error_message: null })
      .eq("id", scheduledPostId)
      .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapScheduledPost(data) : null;
  }

  async markScheduledPostFailed(scheduledPostId: string, errorMessage: string) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .update({ status: "failed", error_message: errorMessage })
      .eq("id", scheduledPostId)
      .select("id, user_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapScheduledPost(data) : null;
  }

  async getSocialAccountCredentials(userId: string, platform: Platform) {
    const { data, error } = await this.supabase
      .from("social_accounts")
      .select("access_token_encrypted, refresh_token_encrypted, provider_metadata")
      .eq("user_id", userId)
      .eq("platform", platform)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.access_token_encrypted) return null;

    return {
      accessToken: decryptSecret(data.access_token_encrypted, this.encryptionSecret),
      refreshToken: data.refresh_token_encrypted
        ? decryptSecret(data.refresh_token_encrypted, this.encryptionSecret)
        : null,
      providerMetadata: data.provider_metadata ?? {},
    };
  }
}
