import { isSandboxMode, liveNotEnabledError, sandboxPublish } from "./sandbox";
import type { Publisher } from "./types";

export const instagramPublisher: Publisher = {
  platform: "instagram",
  async publish(context) {
    if (isSandboxMode(context)) return sandboxPublish(context);

    // Live publishing for Instagram requires the Graph API two-step flow:
    //   1) POST /{ig-user-id}/media        → returns container creation_id
    //   2) POST /{ig-user-id}/media_publish?creation_id=…  → returns provider post id
    // Carousels need a container per child, then a parent CAROUSEL container.
    // Wire this once a Meta App + IG Business account is connected.
    throw liveNotEnabledError(instagramPublisher);
  },
};
