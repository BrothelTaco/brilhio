import { createSandboxProviderPostId } from "../catalog";
import type { Publisher, PublisherContext, PublisherResult } from "./types";

export function sandboxPublish(context: PublisherContext): PublisherResult {
  return {
    providerPostId: createSandboxProviderPostId(context.scheduledPost.platform),
    mode: "sandbox",
  };
}

export function isSandboxMode(context: PublisherContext) {
  return context.credentials.providerMetadata.publishMode !== "live";
}

export function liveNotEnabledError(publisher: Pick<Publisher, "platform">) {
  return new Error(
    `Live publishing for ${publisher.platform} is not enabled. Reconnect the account with live credentials.`,
  );
}
