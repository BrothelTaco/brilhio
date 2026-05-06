import { isSandboxMode, liveNotEnabledError, sandboxPublish } from "./sandbox";
import type { Publisher } from "./types";

export const xPublisher: Publisher = {
  platform: "x",
  async publish(context) {
    if (isSandboxMode(context)) return sandboxPublish(context);

    // Live publishing for X uses API v2:
    //   POST /2/tweets                         — text-only (and reply/quote)
    //   POST /1.1/media/upload (chunked)       — media upload (still v1.1 in 2026)
    //   then attach media_ids on /2/tweets call
    // Requires paid Basic tier or higher for posting.
    throw liveNotEnabledError(xPublisher);
  },
};
