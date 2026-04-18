import type {
  AuthSession,
  CreateMediaUploadSessionInput,
  CreateProviderConnectionInput,
  CreateApprovalTaskInput,
  CreateContentItemInput,
  CreateMediaAssetInput,
  DashboardSnapshot,
  JobRecord,
  MediaAsset,
  MediaUploadSession,
  Platform,
  ProviderCatalogItem,
  QueueJobInput,
  ScheduledPost,
  UpdateApprovalTaskStatusInput,
  UpdateCurrentWorkspaceInput,
} from "@ritmio/contracts";

type ApiClientConfig = {
  baseUrl: string;
  accessToken?: string | null;
  getAccessToken?: (() => Promise<string | null> | string | null) | undefined;
  devUserId?: string | null;
  devUserEmail?: string | null;
  fetchImpl?: typeof fetch;
};

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

type ScheduledPostCreationResult = {
  scheduledPost: ScheduledPost;
  jobRecord: JobRecord;
  enqueued: boolean;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export class RitmioApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ApiClientConfig) {
    this.baseUrl = trimTrailingSlash(config.baseUrl);
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async buildHeaders() {
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    const accessToken =
      typeof this.config.getAccessToken === "function"
        ? await this.config.getAccessToken()
        : (this.config.accessToken ?? null);

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else if (this.config.devUserId) {
      headers.set("x-ritmio-dev-user-id", this.config.devUserId);
      if (this.config.devUserEmail) {
        headers.set("x-ritmio-dev-user-email", this.config.devUserEmail);
      }
    }

    return headers;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const headers = await this.buildHeaders();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...Object.fromEntries(headers.entries()),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as ApiEnvelope<T> | { error?: unknown }) : null;

    if (!response.ok) {
      const message =
        parsed && typeof parsed === "object" && "error" in parsed
          ? JSON.stringify(parsed.error)
          : `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return parsed as ApiEnvelope<T>;
  }

  getSession() {
    return this.request<AuthSession>("/api/me");
  }

  setCurrentWorkspace(input: UpdateCurrentWorkspaceInput) {
    return this.request<AuthSession>("/api/me/current-workspace", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  getDashboard(workspaceId: string) {
    return this.request<DashboardSnapshot>(`/api/workspaces/${workspaceId}/dashboard`);
  }

  listMediaAssets(workspaceId: string) {
    return this.request<MediaAsset[]>(`/api/workspaces/${workspaceId}/media-assets`);
  }

  createMediaAsset(input: CreateMediaAssetInput) {
    return this.request<MediaAsset>("/api/media-assets", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createMediaUploadSession(input: CreateMediaUploadSessionInput) {
    return this.request<MediaUploadSession>("/api/media-assets/upload-session", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createContentItem(input: CreateContentItemInput) {
    return this.request<import("@ritmio/contracts").ContentItem>("/api/content-items", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createApprovalTask(input: CreateApprovalTaskInput) {
    return this.request<import("@ritmio/contracts").ApprovalTask>("/api/approval-tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateApprovalTaskStatus(
    approvalTaskId: string,
    input: UpdateApprovalTaskStatusInput,
  ) {
    return this.request<import("@ritmio/contracts").ApprovalTask>(
      `/api/approval-tasks/${approvalTaskId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  }

  createScheduledPost(input: import("@ritmio/contracts").SchedulePostInput) {
    return this.request<ScheduledPostCreationResult>("/api/scheduled-posts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  queueJob(input: QueueJobInput) {
    return this.request<JobRecord>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listProviders(workspaceId: string) {
    return this.request<ProviderCatalogItem[]>(
      `/api/providers?workspaceId=${encodeURIComponent(workspaceId)}`,
    );
  }

  connectProvider(
    platform: Platform,
    input: CreateProviderConnectionInput,
  ) {
    return this.request<{
      provider: Omit<ProviderCatalogItem, "account">;
      account: import("@ritmio/contracts").SocialAccount;
    }>(
      `/api/providers/${encodeURIComponent(platform)}/connect`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  }
}

export function createRitmioApiClient(config: ApiClientConfig) {
  return new RitmioApiClient(config);
}
