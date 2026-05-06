import { isSandboxMode, liveNotEnabledError, sandboxPublish } from "./sandbox";
import type { Publisher } from "./types";

export const facebookPublisher: Publisher = {
  platform: "facebook",
  async publish(context) {
    if (isSandboxMode(context)) return sandboxPublish(context);

    // Live publishing for Facebook Pages uses Graph API:
    //   POST /{page-id}/feed             — text-only
    //   POST /{page-id}/photos           — single image
    //   POST /{page-id}/videos           — video upload (resumable for large)
    // Wire this once a Page access token (not user token) is stored.
    throw liveNotEnabledError(facebookPublisher);
  },
};
