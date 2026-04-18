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
  Workspace,
} from "@ritmio/contracts";
import {
  demoAiSuggestions,
  demoApprovalTasks,
  demoAuthSession,
  demoContentItems,
  demoDashboardSnapshot,
  demoJobs,
  demoMediaAssets,
  demoScheduledPosts,
  demoSocialAccounts,
  demoWorkspace,
} from "@ritmio/utils";
import { decryptSecret, encryptSecret } from "./crypto";
import type {
  CreateAiSuggestionParams,
  JobRecordUpdate,
  Repository,
  UpsertSocialAccountConnectionInput,
} from "./types";

function makeId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDateString(value: string | null | undefined) {
  return value ?? new Date().toISOString();
}

function firstNameFromEmail(email: string | null) {
  if (!email) {
    return "Ritmio";
  }

  const [candidate] = email.split("@");
  return candidate ? candidate.replace(/[._-]+/g, " ") : "Ritmio";
}

function mapWorkspace(row: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  owner_user_id?: string | null;
  owner_name?: string | null;
}): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    ownerName: row.owner_name ?? "Workspace owner",
    createdAt: ensureDateString(row.created_at),
  };
}

function mapMediaAsset(row: {
  id: string;
  workspace_id: string;
  kind: MediaAsset["kind"];
  title: string;
  storage_path: string;
  alt_text: string | null;
  duration_seconds: number | null;
  created_at: string;
}): MediaAsset {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
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
    workspace_id: string;
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
    workspaceId: row.workspace_id,
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
  workspace_id: string;
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
    workspaceId: row.workspace_id,
    platform: row.platform,
    handle: row.handle,
    status: row.status,
    audienceLabel: row.audience_label,
    tokenExpiresAt: row.token_expires_at,
    providerAccountId:
      typeof metadata.providerAccountId === "string"
        ? metadata.providerAccountId
        : null,
    providerAccountUrn:
      typeof metadata.providerAccountUrn === "string"
        ? metadata.providerAccountUrn
        : null,
    profileUrl:
      typeof metadata.profileUrl === "string" ? metadata.profileUrl : null,
  };
}

function mapScheduledPost(row: {
  id: string;
  workspace_id: string;
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
    workspaceId: row.workspace_id,
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
  workspace_id: string;
  content_item_id: string;
  suggestion_type: AiSuggestion["type"];
  title: string;
  body: string;
  created_at: string;
}): AiSuggestion {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    contentItemId: row.content_item_id,
    type: row.suggestion_type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapApprovalTask(row: {
  id: string;
  workspace_id: string;
  content_item_id: string;
  reviewer_user_id: string | null;
  reviewer_name: string;
  due_at: string;
  status: ApprovalTask["status"];
  note: string;
}): ApprovalTask {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
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
  workspace_id: string;
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
    workspaceId: row.workspace_id,
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

  async getAuthSession(user: AuthenticatedUser): Promise<AuthSession> {
    this.session.user = user;
    this.session.profile.id = user.id;
    this.session.profile.email = user.email;
    this.session.profile.displayName = firstNameFromEmail(user.email);
    return structuredClone(this.session);
  }

  async setCurrentWorkspace(userId: string, workspaceId: string) {
    if (this.session.user.id === userId) {
      this.session.currentWorkspaceId = workspaceId;
      this.session.profile.currentWorkspaceId = workspaceId;
    }
    return structuredClone(this.session);
  }

  async listWorkspacesForUser(_userId: string) {
    return structuredClone(this.session.workspaces);
  }

  async userHasWorkspaceAccess(_userId: string, workspaceId: string) {
    return this.session.workspaces.some((workspace) => workspace.id === workspaceId);
  }

  async getDashboard(workspaceId: string): Promise<DashboardSnapshot | null> {
    if (workspaceId !== demoWorkspace.id) {
      return null;
    }

    return {
      workspace: demoWorkspace,
      socialAccounts: structuredClone(this.socialAccounts),
      mediaAssets: structuredClone(this.mediaAssets),
      contentItems: structuredClone(this.contentItems),
      scheduledPosts: structuredClone(this.scheduledPosts),
      aiSuggestions: structuredClone(this.aiSuggestions),
      approvalTasks: structuredClone(this.approvalTasks),
      jobs: structuredClone(this.jobs),
    };
  }

  async listMediaAssets(workspaceId: string) {
    return this.mediaAssets.filter((asset) => asset.workspaceId === workspaceId);
  }

  async createMediaAsset(input: CreateMediaAssetInput) {
    const created: MediaAsset = {
      id: makeId("asset"),
      workspaceId: input.workspaceId,
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
      workspaceId: input.workspaceId,
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
      workspaceId: input.workspaceId,
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

  async updateApprovalTaskStatus(
    workspaceId: string,
    approvalTaskId: string,
    status: ApprovalStatus,
  ) {
    const found = this.approvalTasks.find(
      (task) => task.workspaceId === workspaceId && task.id === approvalTaskId,
    );
    if (!found) {
      return null;
    }
    found.status = status;
    return structuredClone(found);
  }

  async createScheduledPost(input: SchedulePostInput) {
    const created: ScheduledPost = {
      id: makeId("post"),
      workspaceId: input.workspaceId,
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
      workspaceId: input.workspaceId,
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
    if (!found) {
      return null;
    }
    found.bullmqJobId = bullmqJobId;
    return structuredClone(found);
  }

  async getJobRecord(jobRecordId: string) {
    return this.jobs.find((job) => job.id === jobRecordId) ?? null;
  }

  async updateJobRecord(jobRecordId: string, update: JobRecordUpdate) {
    const found = this.jobs.find((job) => job.id === jobRecordId);
    if (!found) {
      return null;
    }
    Object.assign(found, update);
    return structuredClone(found);
  }

  async createAiSuggestion(input: CreateAiSuggestionParams) {
    this.aiSuggestions.unshift({
      id: makeId("suggestion"),
      workspaceId: input.workspaceId,
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
    return (
      this.scheduledPosts.find((post) => post.id === scheduledPostId) ?? null
    );
  }

  async getSocialAccount(workspaceId: string, platform: Platform) {
    return (
      this.socialAccounts.find(
        (account) =>
          account.workspaceId === workspaceId && account.platform === platform,
      ) ?? null
    );
  }

  async getSocialAccountById(socialAccountId: string) {
    return this.socialAccounts.find((account) => account.id === socialAccountId) ?? null;
  }

  async getSocialAccountCredentials(workspaceId: string, platform: Platform) {
    const account = this.socialAccounts.find(
      (socialAccount) =>
        socialAccount.workspaceId === workspaceId &&
        socialAccount.platform === platform,
    );

    if (!account) {
      return null;
    }

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

  async upsertSocialAccountConnection(
    input: UpsertSocialAccountConnectionInput,
  ) {
    const existing = this.socialAccounts.find(
      (account) =>
        account.workspaceId === input.workspaceId &&
        account.platform === input.platform,
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
      workspaceId: input.workspaceId,
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
    if (!found) {
      return null;
    }
    found.status = "published";
    found.providerPostId = providerPostId;
    found.errorMessage = null;
    return structuredClone(found);
  }

  async markScheduledPostFailed(scheduledPostId: string, errorMessage: string) {
    const found = this.scheduledPosts.find((post) => post.id === scheduledPostId);
    if (!found) {
      return null;
    }
    found.status = "failed";
    found.errorMessage = errorMessage;
    return structuredClone(found);
  }
}

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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return new SupabaseRepository(client, config.encryptionSecret);
  }

  async getAuthSession(user: AuthenticatedUser): Promise<AuthSession> {
    await this.ensureUserProfile(user);

    let workspaces = await this.listWorkspacesForUser(user.id);
    if (workspaces.length === 0) {
      await this.provisionDefaultWorkspace(user);
      workspaces = await this.listWorkspacesForUser(user.id);
    }

    const { data: profileRow, error: profileError } = await this.supabase
      .from("user_profiles")
      .select("id, display_name, email, current_workspace_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const currentWorkspaceId =
      (typeof profileRow?.current_workspace_id === "string" &&
      workspaces.some((workspace) => workspace.id === profileRow.current_workspace_id)
        ? profileRow.current_workspace_id
        : workspaces[0]?.id) ?? null;

    if (currentWorkspaceId && currentWorkspaceId !== profileRow?.current_workspace_id) {
      await this.supabase
        .from("user_profiles")
        .update({ current_workspace_id: currentWorkspaceId })
        .eq("id", user.id);
    }

    return {
      user,
      profile: {
        id: user.id,
        displayName:
          typeof profileRow?.display_name === "string"
            ? profileRow.display_name
            : firstNameFromEmail(user.email),
        email: profileRow?.email ?? user.email,
        currentWorkspaceId,
      },
      workspaces,
      currentWorkspaceId,
    };
  }

  async setCurrentWorkspace(userId: string, workspaceId: string) {
    const hasAccess = await this.userHasWorkspaceAccess(userId, workspaceId);

    if (!hasAccess) {
      throw new Error("Workspace access denied.");
    }

    const { error } = await this.supabase
      .from("user_profiles")
      .update({ current_workspace_id: workspaceId })
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }

    const { data: profileRow, error: profileError } = await this.supabase
      .from("user_profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    return this.getAuthSession({
      id: userId,
      email: profileRow?.email ?? null,
      authSource: "supabase",
    });
  }

  async listWorkspacesForUser(userId: string) {
    const { data, error } = await this.supabase
      .from("workspace_members")
      .select(
        "workspace:workspaces(id, name, slug, timezone, created_at, owner_user_id)",
      )
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    const workspaceRows = (data ?? []).flatMap((row) =>
      Array.isArray(row.workspace)
        ? row.workspace
        : row.workspace
          ? [row.workspace]
          : [],
    ) as Array<{
      id: string;
      name: string;
      slug: string;
      timezone: string;
      created_at: string;
      owner_user_id: string | null;
    }>;

    const ownerIds = workspaceRows
      .map((row) => row.owner_user_id)
      .filter((value): value is string => Boolean(value));

    const ownerMap = new Map<string, string>();

    if (ownerIds.length > 0) {
      const { data: owners } = await this.supabase
        .from("user_profiles")
        .select("id, display_name")
        .in("id", ownerIds);

      for (const owner of owners ?? []) {
        ownerMap.set(owner.id, owner.display_name);
      }
    }

    return workspaceRows.map((row) =>
      mapWorkspace({
        ...row,
        owner_name: row.owner_user_id ? ownerMap.get(row.owner_user_id) ?? "Workspace owner" : "Workspace owner",
      }),
    );
  }

  async userHasWorkspaceAccess(userId: string, workspaceId: string) {
    const { data, error } = await this.supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
  }

  async getDashboard(workspaceId: string): Promise<DashboardSnapshot | null> {
    const { data: workspaceRow, error: workspaceError } = await this.supabase
      .from("workspaces")
      .select("id, name, slug, timezone, created_at, owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspaceError) {
      throw new Error(workspaceError.message);
    }

    if (!workspaceRow) {
      return null;
    }

    const [
      socialAccountsResult,
      mediaAssetsResult,
      contentItemsResult,
      contentItemMediaResult,
      scheduledPostsResult,
      aiSuggestionsResult,
      approvalTasksResult,
      jobsResult,
      ownerProfileResult,
    ] = await Promise.all([
      this.supabase
        .from("social_accounts")
        .select(
          "id, workspace_id, platform, handle, status, audience_label, token_expires_at, provider_metadata",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("media_assets")
        .select(
          "id, workspace_id, kind, title, storage_path, alt_text, duration_seconds, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("content_items")
        .select(
          "id, workspace_id, title, brief, campaign, stage, primary_caption, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("content_item_media")
        .select("content_item_id, media_asset_id, sort_order")
        .order("sort_order", { ascending: true }),
      this.supabase
        .from("scheduled_posts")
        .select(
          "id, workspace_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message",
        )
        .eq("workspace_id", workspaceId)
        .order("scheduled_for", { ascending: true }),
      this.supabase
        .from("ai_suggestions")
        .select(
          "id, workspace_id, content_item_id, suggestion_type, title, body, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("approval_tasks")
        .select(
          "id, workspace_id, content_item_id, reviewer_user_id, reviewer_name, due_at, status, note",
        )
        .eq("workspace_id", workspaceId)
        .order("due_at", { ascending: true }),
      this.supabase
        .from("job_records")
        .select(
          "id, workspace_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      workspaceRow.owner_user_id
        ? this.supabase
            .from("user_profiles")
            .select("display_name")
            .eq("id", workspaceRow.owner_user_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    for (const result of [
      socialAccountsResult,
      mediaAssetsResult,
      contentItemsResult,
      contentItemMediaResult,
      scheduledPostsResult,
      aiSuggestionsResult,
      approvalTasksResult,
      jobsResult,
    ]) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    }

    const mediaByContentId = new Map<string, string[]>();
    for (const row of contentItemMediaResult.data ?? []) {
      const current = mediaByContentId.get(row.content_item_id) ?? [];
      current.push(row.media_asset_id);
      mediaByContentId.set(row.content_item_id, current);
    }

    return {
      workspace: mapWorkspace({
        ...workspaceRow,
        owner_name: ownerProfileResult?.data?.display_name ?? "Workspace owner",
      }),
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

  async listMediaAssets(workspaceId: string) {
    const { data, error } = await this.supabase
      .from("media_assets")
      .select(
        "id, workspace_id, kind, title, storage_path, alt_text, duration_seconds, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapMediaAsset);
  }

  async createMediaAsset(input: CreateMediaAssetInput) {
    const { data, error } = await this.supabase
      .from("media_assets")
      .insert({
        workspace_id: input.workspaceId,
        kind: input.kind,
        title: input.title,
        storage_path: input.storagePath,
        alt_text: input.altText,
        duration_seconds: input.durationSeconds,
      })
      .select(
        "id, workspace_id, kind, title, storage_path, alt_text, duration_seconds, created_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapMediaAsset(data);
  }

  async createContentItem(input: CreateContentItemInput) {
    const { data, error } = await this.supabase
      .from("content_items")
      .insert({
        workspace_id: input.workspaceId,
        title: input.title,
        brief: input.brief,
        campaign: input.campaign,
        primary_caption: input.primaryCaption,
      })
      .select(
        "id, workspace_id, title, brief, campaign, stage, primary_caption, created_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

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

      if (relationError) {
        throw new Error(relationError.message);
      }
    }

    return mapContentItem(data, input.mediaAssetIds);
  }

  async createApprovalTask(input: CreateApprovalTaskInput) {
    const { data, error } = await this.supabase
      .from("approval_tasks")
      .insert({
        workspace_id: input.workspaceId,
        content_item_id: input.contentItemId,
        reviewer_user_id: input.reviewerUserId,
        reviewer_name: input.reviewerName,
        due_at: input.dueAt,
        note: input.note,
      })
      .select(
        "id, workspace_id, content_item_id, reviewer_user_id, reviewer_name, due_at, status, note",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapApprovalTask(data);
  }

  async updateApprovalTaskStatus(
    workspaceId: string,
    approvalTaskId: string,
    status: ApprovalStatus,
  ) {
    const { data, error } = await this.supabase
      .from("approval_tasks")
      .update({ status })
      .eq("workspace_id", workspaceId)
      .eq("id", approvalTaskId)
      .select(
        "id, workspace_id, content_item_id, reviewer_user_id, reviewer_name, due_at, status, note",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapApprovalTask(data) : null;
  }

  async createScheduledPost(input: SchedulePostInput) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .insert({
        workspace_id: input.workspaceId,
        content_item_id: input.contentItemId,
        platform: input.platform,
        scheduled_for: input.scheduledFor,
        platform_caption: input.platformCaption,
        publish_window_label: input.publishWindowLabel,
        status: "scheduled",
      })
      .select(
        "id, workspace_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapScheduledPost(data);
  }

  async createJobRecord(input: QueueJobInput) {
    const { data, error } = await this.supabase
      .from("job_records")
      .insert({
        workspace_id: input.workspaceId,
        type: input.type,
        target_table: input.targetTable,
        target_id: input.targetId,
        scheduled_for: input.scheduledFor,
        payload: input.payload,
      })
      .select(
        "id, workspace_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapJobRecord(data);
  }

  async attachBullmqJobId(jobRecordId: string, bullmqJobId: string) {
    const { data, error } = await this.supabase
      .from("job_records")
      .update({ bullmq_job_id: bullmqJobId })
      .eq("id", jobRecordId)
      .select(
        "id, workspace_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapJobRecord(data) : null;
  }

  async getJobRecord(jobRecordId: string) {
    const { data, error } = await this.supabase
      .from("job_records")
      .select(
        "id, workspace_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload",
      )
      .eq("id", jobRecordId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapJobRecord(data) : null;
  }

  async updateJobRecord(jobRecordId: string, update: JobRecordUpdate) {
    const patch: Record<string, unknown> = {};

    if (update.status) {
      patch.status = update.status;
    }
    if (typeof update.attemptCount === "number") {
      patch.attempt_count = update.attemptCount;
    }
    if (update.lastError !== undefined) {
      patch.last_error = update.lastError;
    }
    if (update.bullmqJobId !== undefined) {
      patch.bullmq_job_id = update.bullmqJobId;
    }

    const { data, error } = await this.supabase
      .from("job_records")
      .update(patch)
      .eq("id", jobRecordId)
      .select(
        "id, workspace_id, type, status, target_table, target_id, attempt_count, scheduled_for, created_at, bullmq_job_id, last_error, payload",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapJobRecord(data) : null;
  }

  async createAiSuggestion(input: CreateAiSuggestionParams) {
    const { error } = await this.supabase.from("ai_suggestions").insert({
      workspace_id: input.workspaceId,
      content_item_id: input.contentItemId,
      suggestion_type: input.type,
      title: input.title,
      body: input.body,
      model_name: input.modelName,
      source_job_id: input.sourceJobId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async getContentItem(contentItemId: string) {
    const { data, error } = await this.supabase
      .from("content_items")
      .select(
        "id, workspace_id, title, brief, campaign, stage, primary_caption, created_at",
      )
      .eq("id", contentItemId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const { data: mediaRows, error: mediaError } = await this.supabase
      .from("content_item_media")
      .select("media_asset_id, sort_order")
      .eq("content_item_id", contentItemId)
      .order("sort_order", { ascending: true });

    if (mediaError) {
      throw new Error(mediaError.message);
    }

    return mapContentItem(
      data,
      (mediaRows ?? []).map((row) => row.media_asset_id),
    );
  }

  async getScheduledPost(scheduledPostId: string) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .select(
        "id, workspace_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message",
      )
      .eq("id", scheduledPostId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapScheduledPost(data) : null;
  }

  async getSocialAccount(workspaceId: string, platform: Platform) {
    const { data, error } = await this.supabase
      .from("social_accounts")
      .select(
        "id, workspace_id, platform, handle, status, audience_label, token_expires_at, provider_metadata",
      )
      .eq("workspace_id", workspaceId)
      .eq("platform", platform)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSocialAccount(data) : null;
  }

  async getSocialAccountById(socialAccountId: string) {
    const { data, error } = await this.supabase
      .from("social_accounts")
      .select(
        "id, workspace_id, platform, handle, status, audience_label, token_expires_at, provider_metadata",
      )
      .eq("id", socialAccountId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSocialAccount(data) : null;
  }

  async upsertSocialAccountConnection(
    input: UpsertSocialAccountConnectionInput,
  ) {
    const encryptedAccessToken = encryptSecret(
      input.accessToken ?? "",
      this.encryptionSecret,
    );
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
      .eq("workspace_id", input.workspaceId)
      .eq("platform", input.platform)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

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
          workspace_id: input.workspaceId,
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
      .select(
        "id, workspace_id, platform, handle, status, audience_label, token_expires_at, provider_metadata",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapSocialAccount(data);
  }

  async markScheduledPostPublished(scheduledPostId: string, providerPostId: string) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .update({
        status: "published",
        provider_post_id: providerPostId,
        error_message: null,
      })
      .eq("id", scheduledPostId)
      .select(
        "id, workspace_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapScheduledPost(data) : null;
  }

  async markScheduledPostFailed(scheduledPostId: string, errorMessage: string) {
    const { data, error } = await this.supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", scheduledPostId)
      .select(
        "id, workspace_id, content_item_id, platform, scheduled_for, status, platform_caption, publish_window_label, provider_post_id, error_message",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapScheduledPost(data) : null;
  }

  async getSocialAccountCredentials(workspaceId: string, platform: Platform) {
    const { data, error } = await this.supabase
      .from("social_accounts")
      .select("access_token_encrypted, refresh_token_encrypted, provider_metadata")
      .eq("workspace_id", workspaceId)
      .eq("platform", platform)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.access_token_encrypted) {
      return null;
    }

    return {
      accessToken: decryptSecret(data.access_token_encrypted, this.encryptionSecret),
      refreshToken: data.refresh_token_encrypted
        ? decryptSecret(data.refresh_token_encrypted, this.encryptionSecret)
        : null,
      providerMetadata: data.provider_metadata ?? {},
    };
  }

  private async ensureUserProfile(user: AuthenticatedUser) {
    const displayName = firstNameFromEmail(user.email);
    const payload: {
      id: string;
      display_name: string;
      email?: string | null;
    } = {
      id: user.id,
      display_name: displayName,
    };

    if (user.email !== null) {
      payload.email = user.email;
    }

    const { error } = await this.supabase
      .from("user_profiles")
      .upsert(payload, {
        onConflict: "id",
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  private async provisionDefaultWorkspace(user: AuthenticatedUser) {
    const workspaceName = `${firstNameFromEmail(user.email)} Workspace`;
    const { data: workspaceRow, error: workspaceError } = await this.supabase
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug: `${slugify(workspaceName)}-${randomUUID().slice(0, 8)}`,
        timezone: "America/Denver",
        owner_user_id: user.id,
      })
      .select("id")
      .single();

    if (workspaceError) {
      throw new Error(workspaceError.message);
    }

    const { error: memberError } = await this.supabase.from("workspace_members").insert({
      workspace_id: workspaceRow.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    const { error: profileError } = await this.supabase
      .from("user_profiles")
      .update({ current_workspace_id: workspaceRow.id })
      .eq("id", user.id);

    if (profileError) {
      throw new Error(profileError.message);
    }
  }
}
