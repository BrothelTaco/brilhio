import { isSandboxMode, liveNotEnabledError, sandboxPublish } from "./sandbox";
import type { Publisher } from "./types";

export const tiktokPublisher: Publisher = {
  platform: "tiktok",
  async publish(context) {
    if (isSandboxMode(context)) return sandboxPublish(context);

    // Live publishing for TikTok uses the Content Posting API:
    //   POST /v2/post/publish/video/init/    — opens an upload session
    //   PUT  upload_url                       — chunked video upload
    //   POST /v2/post/publish/status/fetch/  — poll until publish completes
    // Requires app review + content-posting scope. Wire when approved.
    throw liveNotEnabledError(tiktokPublisher);
  },
};
