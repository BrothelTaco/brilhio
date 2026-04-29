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
]);
export type JobTargetTable = z.infer<typeof jobTargetTableSchema>;

export const authenticatedUserSchema = z.object({
  id: entityIdSchema,
  email: z.string().email().nullable(),
  authSource: z.enum(["supabase", "development"]),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const userProfileSchema = z.object({
  id: z.string().min(1),
  userId: entityIdSchema,
  email: z.string(),
  timezone: z.string().default("UTC"),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  subscriptionCurrentPeriodEnd: z.string().nullable(),
  subscriptionCancelAtPeriodEnd: z.boolean().default(false),
  createdAt: z.string(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const userStrategyProfileSchema = z.object({
  userId: entityIdSchema,
  identityType: z.string().nullable(),
  goals: z.array(z.string()),
  voiceAttributes: z.array(z.string()),
  platformPriorities: z.record(z.string(), z.string()),
  contentPillars: z.array(z.string()),
  audienceNotes: z.string().nullable(),
  updatedAt: z.string().min(1),
});
export type UserStrategyProfile = z.infer<typeof userStrategyProfileSchema>;

export const authSessionSchema = z.object({
  user: authenticatedUserSchema,
  profile: userProfileSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const socialAccountSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
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
  userId: entityIdSchema,
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
  userId: entityIdSchema,
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
  userId: entityIdSchema,
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
  userId: entityIdSchema,
  contentItemId: entityIdSchema,
  type: z.enum(["caption", "hashtag_set", "publish_window", "content_idea"]),
  title: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.string().min(1),
});
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

export const approvalTaskSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
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
  userId: entityIdSchema,
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
  userId: entityIdSchema.nullable(),
  platform: platformSchema,
  eventType: z.string().min(1),
  receivedAt: z.string().min(1),
  payloadSummary: z.string().min(1),
});
export type ProviderWebhook = z.infer<typeof providerWebhookSchema>;

export const createMediaAssetInputSchema = z.object({
  userId: entityIdSchema,
  kind: assetKindSchema,
  title: z.string().min(1),
  storagePath: z.string().min(1),
  altText: z.string().nullable().default(null),
  durationSeconds: z.number().int().nonnegative().nullable().default(null),
});
export type CreateMediaAssetInput = z.infer<typeof createMediaAssetInputSchema>;

export const createMediaUploadSessionInputSchema = z.object({
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
  userId: entityIdSchema,
  title: z.string().min(1),
  brief: z.string().min(1),
  campaign: z.string().min(1),
  primaryCaption: z.string().min(1),
  mediaAssetIds: z.array(entityIdSchema).default([]),
});
export type CreateContentItemInput = z.infer<typeof createContentItemInputSchema>;

export const createApprovalTaskInputSchema = z.object({
  userId: entityIdSchema,
  contentItemId: entityIdSchema,
  reviewerName: z.string().min(1),
  reviewerUserId: entityIdSchema.nullable().default(null),
  dueAt: z.string().min(1),
  note: z.string().min(1),
});
export type CreateApprovalTaskInput = z.infer<typeof createApprovalTaskInputSchema>;

export const updateApprovalTaskStatusInputSchema = z.object({
  status: approvalStatusSchema,
});
export type UpdateApprovalTaskStatusInput = z.infer<
  typeof updateApprovalTaskStatusInputSchema
>;

export const schedulePostInputSchema = z.object({
  userId: entityIdSchema,
  contentItemId: entityIdSchema,
  platform: platformSchema,
  scheduledFor: z.string().min(1),
  platformCaption: z.string().min(1),
  publishWindowLabel: z.string().min(1),
});
export type SchedulePostInput = z.infer<typeof schedulePostInputSchema>;

// API-layer schema: client sends a naive local datetime, server converts to UTC using user timezone.
export const schedulePostRequestInputSchema = z.object({
  contentItemId: entityIdSchema,
  platform: platformSchema,
  localScheduledFor: z.string().min(1),
  platformCaption: z.string().min(1),
  publishWindowLabel: z.string().min(1),
});
export type SchedulePostRequestInput = z.infer<typeof schedulePostRequestInputSchema>;

export const updateUserTimezoneInputSchema = z.object({
  timezone: z.string().min(1),
});
export type UpdateUserTimezoneInput = z.infer<typeof updateUserTimezoneInputSchema>;

export const updateUserStrategyProfileInputSchema = z.object({
  identityType: z.string().min(1).nullable().default(null),
  goals: z.array(z.string().min(1)).default([]),
  voiceAttributes: z.array(z.string().min(1)).default([]),
  platformPriorities: z.record(z.string(), z.string()).default({}),
  contentPillars: z.array(z.string().min(1)).default([]),
  audienceNotes: z.string().nullable().default(null),
});
export type UpdateUserStrategyProfileInput = z.infer<
  typeof updateUserStrategyProfileInputSchema
>;

export const queueJobInputSchema = z.object({
  userId: entityIdSchema,
  type: jobTypeSchema,
  targetTable: jobTargetTableSchema,
  targetId: entityIdSchema,
  scheduledFor: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type QueueJobInput = z.infer<typeof queueJobInputSchema>;

export const createProviderConnectionInputSchema = z.object({
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
  userId: entityIdSchema,
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
  socialAccounts: z.array(socialAccountSchema),
  mediaAssets: z.array(mediaAssetSchema),
  contentItems: z.array(contentItemSchema),
  scheduledPosts: z.array(scheduledPostSchema),
  aiSuggestions: z.array(aiSuggestionSchema),
  approvalTasks: z.array(approvalTaskSchema),
  jobs: z.array(jobRecordSchema),
});
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
