import { z } from "zod";

export const entityIdSchema = z.string().min(1);
export type EntityId = z.infer<typeof entityIdSchema>;

export const platformSchema = z.enum([
  "instagram",
  "tiktok",
  "facebook",
  "x",
]);
export type Platform = z.infer<typeof platformSchema>;

export const socialAccountStatusSchema = z.enum([
  "connected",
  "attention_required",
  "disconnected",
]);
export type SocialAccountStatus = z.infer<typeof socialAccountStatusSchema>;

export const workspaceMemberRoleSchema = z.enum([
  "owner",
  "editor",
  "approver",
  "viewer",
]);
export type WorkspaceMemberRole = z.infer<typeof workspaceMemberRoleSchema>;

export const assetKindSchema = z.enum(["image", "video", "carousel", "document"]);
export type AssetKind = z.infer<typeof assetKindSchema>;

export const contentStageSchema = z.enum([
  "draft",
  "ready_for_review",
  "approved",
  "scheduled",
  "published",
  "failed",
]);
export type ContentStage = z.infer<typeof contentStageSchema>;

export const postStatusSchema = z.enum([
  "draft",
  "queued",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "paused",
]);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const approvalStatusSchema = z.enum([
  "pending",
  "approved",
  "changes_requested",
  "rejected",
]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const jobTypeSchema = z.enum([
  "build-calendar",
  "generate-caption",
  "generate-platform-variants",
  "publish-scheduled-post",
  "refresh-social-token",
  "ingest-provider-webhook",
]);
export type JobType = z.infer<typeof jobTypeSchema>;

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "retrying",
  "failed",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobTargetTableSchema = z.enum([
  "content_items",
  "scheduled_posts",
  "social_accounts",
  "provider_webhooks",
  "workspaces",
]);
export type JobTargetTable = z.infer<typeof jobTargetTableSchema>;

export const authenticatedUserSchema = z.object({
  id: entityIdSchema,
  email: z.string().email().nullable(),
  authSource: z.enum(["supabase", "development"]),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const workspaceSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  timezone: z.string().min(1),
  ownerName: z.string().min(1),
  createdAt: z.string().min(1),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const userProfileSchema = z.object({
  id: entityIdSchema,
  displayName: z.string().min(1),
  email: z.string().email().nullable(),
  currentWorkspaceId: entityIdSchema.nullable(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const socialAccountSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  platform: platformSchema,
  handle: z.string().min(1),
  status: socialAccountStatusSchema,
  audienceLabel: z.string().min(1),
  tokenExpiresAt: z.string().nullable(),
  providerAccountId: z.string().nullable().optional(),
  providerAccountUrn: z.string().nullable().optional(),
  profileUrl: z.string().nullable().optional(),
});
export type SocialAccount = z.infer<typeof socialAccountSchema>;

export const mediaAssetSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  kind: assetKindSchema,
  title: z.string().min(1),
  storagePath: z.string().min(1),
  altText: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  createdAt: z.string().min(1),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const contentItemSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  title: z.string().min(1),
  brief: z.string().min(1),
  campaign: z.string().min(1),
  stage: contentStageSchema,
  mediaAssetIds: z.array(entityIdSchema),
  primaryCaption: z.string().min(1),
  createdAt: z.string().min(1),
});
export type ContentItem = z.infer<typeof contentItemSchema>;

export const scheduledPostSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  contentItemId: entityIdSchema,
  platform: platformSchema,
  scheduledFor: z.string().min(1),
  status: postStatusSchema,
  platformCaption: z.string().min(1),
  publishWindowLabel: z.string().min(1),
  providerPostId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});
export type ScheduledPost = z.infer<typeof scheduledPostSchema>;

export const aiSuggestionSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  contentItemId: entityIdSchema,
  type: z.enum(["caption", "hashtag_set", "publish_window", "content_idea"]),
  title: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.string().min(1),
});
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

export const approvalTaskSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  contentItemId: entityIdSchema,
  reviewerUserId: entityIdSchema.nullable().optional(),
  reviewerName: z.string().min(1),
  dueAt: z.string().min(1),
  status: approvalStatusSchema,
  note: z.string().min(1),
});
export type ApprovalTask = z.infer<typeof approvalTaskSchema>;

export const jobRecordSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  type: jobTypeSchema,
  status: jobStatusSchema,
  targetTable: jobTargetTableSchema,
  targetId: entityIdSchema,
  attemptCount: z.number().int().nonnegative(),
  scheduledFor: z.string().min(1),
  createdAt: z.string().min(1),
  bullmqJobId: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type JobRecord = z.infer<typeof jobRecordSchema>;

export const providerWebhookSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  platform: platformSchema,
  eventType: z.string().min(1),
  receivedAt: z.string().min(1),
  payloadSummary: z.string().min(1),
});
export type ProviderWebhook = z.infer<typeof providerWebhookSchema>;

export const authSessionSchema = z.object({
  user: authenticatedUserSchema,
  profile: userProfileSchema,
  workspaces: z.array(workspaceSchema),
  currentWorkspaceId: entityIdSchema.nullable(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const createMediaAssetInputSchema = z.object({
  workspaceId: entityIdSchema,
  kind: assetKindSchema,
  title: z.string().min(1),
  storagePath: z.string().min(1),
  altText: z.string().nullable().default(null),
  durationSeconds: z.number().int().nonnegative().nullable().default(null),
});
export type CreateMediaAssetInput = z.infer<typeof createMediaAssetInputSchema>;

export const createMediaUploadSessionInputSchema = z.object({
  workspaceId: entityIdSchema,
  kind: assetKindSchema,
  title: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  altText: z.string().nullable().default(null),
  durationSeconds: z.number().int().nonnegative().nullable().default(null),
});
export type CreateMediaUploadSessionInput = z.infer<
  typeof createMediaUploadSessionInputSchema
>;

export const mediaUploadSessionSchema = z.object({
  bucket: z.string().min(1),
  storagePath: z.string().min(1),
  uploadToken: z.string().min(1),
  uploadPath: z.string().min(1),
  contentType: z.string().min(1),
});
export type MediaUploadSession = z.infer<typeof mediaUploadSessionSchema>;

export const createContentItemInputSchema = z.object({
  workspaceId: entityIdSchema,
  title: z.string().min(1),
  brief: z.string().min(1),
  campaign: z.string().min(1),
  primaryCaption: z.string().min(1),
  mediaAssetIds: z.array(entityIdSchema).default([]),
});
export type CreateContentItemInput = z.infer<typeof createContentItemInputSchema>;

export const createApprovalTaskInputSchema = z.object({
  workspaceId: entityIdSchema,
  contentItemId: entityIdSchema,
  reviewerName: z.string().min(1),
  reviewerUserId: entityIdSchema.nullable().default(null),
  dueAt: z.string().min(1),
  note: z.string().min(1),
});
export type CreateApprovalTaskInput = z.infer<typeof createApprovalTaskInputSchema>;

export const updateApprovalTaskStatusInputSchema = z.object({
  workspaceId: entityIdSchema,
  status: approvalStatusSchema,
});
export type UpdateApprovalTaskStatusInput = z.infer<
  typeof updateApprovalTaskStatusInputSchema
>;

export const schedulePostInputSchema = z.object({
  workspaceId: entityIdSchema,
  contentItemId: entityIdSchema,
  platform: platformSchema,
  scheduledFor: z.string().min(1),
  platformCaption: z.string().min(1),
  publishWindowLabel: z.string().min(1),
});
export type SchedulePostInput = z.infer<typeof schedulePostInputSchema>;

// API-layer schema: client sends a naive local datetime (no offset), server converts to UTC.
export const schedulePostRequestInputSchema = z.object({
  workspaceId: entityIdSchema,
  contentItemId: entityIdSchema,
  platform: platformSchema,
  localScheduledFor: z.string().min(1),
  platformCaption: z.string().min(1),
  publishWindowLabel: z.string().min(1),
});
export type SchedulePostRequestInput = z.infer<typeof schedulePostRequestInputSchema>;

export const updateWorkspaceTimezoneInputSchema = z.object({
  timezone: z.string().min(1),
});
export type UpdateWorkspaceTimezoneInput = z.infer<typeof updateWorkspaceTimezoneInputSchema>;

export const queueJobInputSchema = z.object({
  workspaceId: entityIdSchema,
  type: jobTypeSchema,
  targetTable: jobTargetTableSchema,
  targetId: entityIdSchema,
  scheduledFor: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type QueueJobInput = z.infer<typeof queueJobInputSchema>;

export const updateCurrentWorkspaceInputSchema = z.object({
  workspaceId: entityIdSchema,
});
export type UpdateCurrentWorkspaceInput = z.infer<
  typeof updateCurrentWorkspaceInputSchema
>;

export const createProviderConnectionInputSchema = z.object({
  workspaceId: entityIdSchema,
  platform: platformSchema,
  handle: z.string().min(1),
  audienceLabel: z.string().min(1),
  accessToken: z.string().min(1).nullable().default(null),
  refreshToken: z.string().min(1).nullable().default(null),
  tokenExpiresAt: z.string().nullable().default(null),
  providerAccountId: z.string().nullable().default(null),
  profileUrl: z.string().nullable().default(null),
});
export type CreateProviderConnectionInput = z.infer<
  typeof createProviderConnectionInputSchema
>;

export const providerCatalogItemSchema = z.object({
  platform: platformSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  connectionMode: z.literal("manual"),
  publishMode: z.literal("sandbox"),
  supportedAssetKinds: z.array(assetKindSchema),
  account: socialAccountSchema.nullable(),
});
export type ProviderCatalogItem = z.infer<typeof providerCatalogItemSchema>;

const baseJobPayloadSchema = z.object({
  jobRecordId: entityIdSchema,
  workspaceId: entityIdSchema,
});

export const buildCalendarJobPayloadSchema = baseJobPayloadSchema.extend({
  type: z.literal("build-calendar"),
});
export type BuildCalendarJobPayload = z.infer<typeof buildCalendarJobPayloadSchema>;

export const generateCaptionJobPayloadSchema = baseJobPayloadSchema.extend({
  type: z.literal("generate-caption"),
  contentItemId: entityIdSchema,
});
export type GenerateCaptionJobPayload = z.infer<
  typeof generateCaptionJobPayloadSchema
>;

export const generatePlatformVariantsJobPayloadSchema =
  baseJobPayloadSchema.extend({
    type: z.literal("generate-platform-variants"),
    contentItemId: entityIdSchema,
  });
export type GeneratePlatformVariantsJobPayload = z.infer<
  typeof generatePlatformVariantsJobPayloadSchema
>;

export const publishScheduledPostJobPayloadSchema = baseJobPayloadSchema.extend({
  type: z.literal("publish-scheduled-post"),
  scheduledPostId: entityIdSchema,
});
export type PublishScheduledPostJobPayload = z.infer<
  typeof publishScheduledPostJobPayloadSchema
>;

export const refreshSocialTokenJobPayloadSchema = baseJobPayloadSchema.extend({
  type: z.literal("refresh-social-token"),
  socialAccountId: entityIdSchema,
});
export type RefreshSocialTokenJobPayload = z.infer<
  typeof refreshSocialTokenJobPayloadSchema
>;

export const ingestProviderWebhookJobPayloadSchema = baseJobPayloadSchema.extend({
  type: z.literal("ingest-provider-webhook"),
  providerWebhookId: entityIdSchema,
});
export type IngestProviderWebhookJobPayload = z.infer<
  typeof ingestProviderWebhookJobPayloadSchema
>;

export const jobPayloadSchema = z.discriminatedUnion("type", [
  buildCalendarJobPayloadSchema,
  generateCaptionJobPayloadSchema,
  generatePlatformVariantsJobPayloadSchema,
  publishScheduledPostJobPayloadSchema,
  refreshSocialTokenJobPayloadSchema,
  ingestProviderWebhookJobPayloadSchema,
]);
export type JobPayload = z.infer<typeof jobPayloadSchema>;

export const dashboardSnapshotSchema = z.object({
  workspace: workspaceSchema,
  socialAccounts: z.array(socialAccountSchema),
  mediaAssets: z.array(mediaAssetSchema),
  contentItems: z.array(contentItemSchema),
  scheduledPosts: z.array(scheduledPostSchema),
  aiSuggestions: z.array(aiSuggestionSchema),
  approvalTasks: z.array(approvalTaskSchema),
  jobs: z.array(jobRecordSchema),
});
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
