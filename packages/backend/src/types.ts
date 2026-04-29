import type {
  ApprovalStatus,
  ApprovalTask,
  AuthSession,
  AuthenticatedUser,
  CreateProviderConnectionInput,
  CreateApprovalTaskInput,
  CreateContentItemInput,
  CreateMediaAssetInput,
  DashboardSnapshot,
  JobPayload,
  JobRecord,
  JobStatus,
  MediaAsset,
  Platform,
  QueueJobInput,
  ScheduledPost,
  SchedulePostInput,
  SocialAccount,
} from "@brilhio/contracts";

export type RepositoryMode = "supabase" | "memory";

export type JobRecordUpdate = {
  status?: JobStatus;
  attemptCount?: number;
  lastError?: string | null;
  bullmqJobId?: string | null;
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

export type SocialAccountCredentials = {
  accessToken: string | null;
  refreshToken: string | null;
  providerMetadata: Record<string, unknown>;
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
  listOverdueJobRecords(): Promise<JobRecord[]>;
  getDashboard(userId: string): Promise<DashboardSnapshot>;
  listMediaAssets(userId: string): Promise<MediaAsset[]>;
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
  markScheduledPostPublished(scheduledPostId: string, providerPostId: string): Promise<ScheduledPost | null>;
  markScheduledPostFailed(scheduledPostId: string, errorMessage: string): Promise<ScheduledPost | null>;
}

export type RuntimeQueueJob = {
  record: JobRecord;
  payload: JobPayload;
};
