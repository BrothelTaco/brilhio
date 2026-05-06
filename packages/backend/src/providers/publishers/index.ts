import type { Platform } from "@brilhio/contracts";
import { facebookPublisher } from "./facebook";
import { instagramPublisher } from "./instagram";
import { tiktokPublisher } from "./tiktok";
import { xPublisher } from "./x";
import type { Publisher, PublisherContext, PublisherResult } from "./types";

const publishers: Record<Platform, Publisher> = {
  instagram: instagramPublisher,
  tiktok: tiktokPublisher,
  facebook: facebookPublisher,
  x: xPublisher,
};

export function getPublisher(platform: Platform): Publisher {
  return publishers[platform];
}

export async function dispatchPublish(context: PublisherContext): Promise<PublisherResult> {
  return getPublisher(context.scheduledPost.platform).publish(context);
}

export type { Publisher, PublisherContext, PublisherResult, PublisherMediaRef } from "./types";
