import type {
  ApprovalStatus,
  ApprovalTask,
  AuthSession,
  AuthenticatedUser,
  CreateProviderConnectionInput,
  CreateApprovalTaskInput,
  CreateContentItemInput,
  CreateMediaAssetInput,
  CreateRecommendedSlotInput,
  DashboardSnapshot,
  JobPayload,
  JobRecord,
  JobStatus,
  MediaAsset,
  Platform,
  QueueJobInput,
  RecommendedSlot,
  ScheduledPost,
  SchedulePostInput,
  SocialAccount,
  UpdateUserStrategyProfileInput,
  UserStrategyProfile,
} from "@brilhio/contracts";

export type RepositoryMode = "supabase" | "memory";

export type JobRecordUpdate = {
  status?: JobStatus;
  attemptCount?: number;
  lastError?: string | null;
  bullmqJobId?: string | null;
};

export type BillingProfileUpdate = {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean;
};

export type BillingProfileForReconciliation = {
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type CreateAiSuggestionParams = {
  userId: string;
  contentItemId: string;
  type: "caption" | "hashtag_set" | "publish_window" | "content_idea";
  title: string;
  body: string;
  modelName?: string | null;
  sourceJobId?: string | null;
};

export type UpsertSocialAccountConnectionInput = CreateProviderConnectionInput & {
  userId: string;
  providerMetadata?: Record<string, unknown>;
};

export type CreateProviderOAuthStateInput = {
  userId: string;
  platform: Platform;
  stateHash: string;
  codeVerifier?: string | null;
  redirectPath: string;
  expiresAt: string;
};

export type ProviderOAuthState = {
  id: string;
  userId: string;
  platform: Platform;
  stateHash: string;
  codeVerifier: string | null;
  redirectPath: string;
  expiresAt: string;
  createdAt: string;
};

export type SocialAccountCredentials = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  providerMetadata: Record<string, unknown>;
};

export type UpdateSocialAccountCredentialsInput = {
  userId: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  providerMetadata?: Record<string, unknown>;
};

export type AuthResolution = {
  user: AuthenticatedUser;
  session: AuthSession;
};

export interface Repository {
  mode: RepositoryMode;
  getAuthSession(user: AuthenticatedUser): Promise<AuthSession>;
  updateUserTimezone(userId: string, timezone: string): Promise<void>;
  getUserTimezone(userId: string): Promise<string>;
  getUserStrategyProfile(userId: string): Promise<UserStrategyProfile>;
  updateUserStrategyProfile(userId: string, input: UpdateUserStrategyProfileInput): Promise<UserStrategyProfile>;
  setBrandBrief(userId: string, brandBrief: string): Promise<UserStrategyProfile>;
  setOnboardingCompleted(userId: string): Promise<void>;
  ensureStripeCustomerId(userId: string, email: string | null, stripeCustomerId: string): Promise<void>;
  updateBillingProfileByUserId(userId: string, update: BillingProfileUpdate): Promise<void>;
  updateBillingProfileByStripeCustomerId(stripeCustomerId: string, update: BillingProfileUpdate): Promise<void>;
  listBillingProfilesForReconciliation(): Promise<BillingProfileForReconciliation[]>;
  hasProcessedStripeWebhookEvent(stripeEventId: string): Promise<boolean>;
  recordProcessedStripeWebhookEvent(stripeEventId: string, eventType: string): Promise<void>;
  userHasActiveSubscription(userId: string): Promise<boolean>;
  listOverdueJobRecords(): Promise<JobRecord[]>;
  getDashboard(userId: string): Promise<DashboardSnapshot>;
  listMediaAssets(userId: string): Promise<MediaAsset[]>;
  getMediaAssetsByIds(ids: string[]): Promise<MediaAsset[]>;
  createSignedMediaUrl(storagePath: string, expiresInSeconds: number): Promise<string | null>;
  createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAsset>;
  createContentItem(input: CreateContentItemInput): Promise<import("@brilhio/contracts").ContentItem>;
  createApprovalTask(input: CreateApprovalTaskInput): Promise<ApprovalTask>;
  updateApprovalTaskStatus(userId: string, approvalTaskId: string, status: ApprovalStatus): Promise<ApprovalTask | null>;
  createScheduledPost(input: SchedulePostInput): Promise<ScheduledPost>;
  createJobRecord(input: QueueJobInput): Promise<JobRecord>;
  attachBullmqJobId(jobRecordId: string, bullmqJobId: string): Promise<JobRecord | null>;
  getJobRecord(jobRecordId: string): Promise<JobRecord | null>;
  updateJobRecord(jobRecordId: string, update: JobRecordUpdate): Promise<JobRecord | null>;
  createAiSuggestion(input: CreateAiSuggestionParams): Promise<void>;
  getContentItem(contentItemId: string): Promise<import("@brilhio/contracts").ContentItem | null>;
  getScheduledPost(scheduledPostId: string): Promise<ScheduledPost | null>;
  getSocialAccount(userId: string, platform: Platform): Promise<SocialAccount | null>;
  getSocialAccountById(socialAccountId: string): Promise<SocialAccount | null>;
  getSocialAccountCredentials(userId: string, platform: Platform): Promise<SocialAccountCredentials | null>;
  upsertSocialAccountConnection(input: UpsertSocialAccountConnectionInput): Promise<SocialAccount>;
  updateSocialAccountCredentials(input: UpdateSocialAccountCredentialsInput): Promise<SocialAccount | null>;
  disconnectSocialAccount(userId: string, platform: Platform): Promise<SocialAccount | null>;
  createProviderOAuthState(input: CreateProviderOAuthStateInput): Promise<ProviderOAuthState>;
  consumeProviderOAuthState(stateHash: string): Promise<ProviderOAuthState | null>;
  markScheduledPostPublished(scheduledPostId: string, providerPostId: string): Promise<ScheduledPost | null>;
  markScheduledPostFailed(scheduledPostId: string, errorMessage: string): Promise<ScheduledPost | null>;
  listRecommendedSlots(userId: string): Promise<RecommendedSlot[]>;
  getRecommendedSlot(slotId: string): Promise<RecommendedSlot | null>;
  createRecommendedSlot(input: CreateRecommendedSlotInput): Promise<RecommendedSlot>;
  dismissRecommendedSlot(userId: string, slotId: string): Promise<RecommendedSlot | null>;
  markRecommendedSlotFilled(userId: string, slotId: string, scheduledPostId: string): Promise<RecommendedSlot | null>;
  deleteOpenRecommendedSlots(userId: string): Promise<void>;
}

export type RuntimeQueueJob = {
  record: JobRecord;
  payload: JobPayload;
};
