import type {
  ContentItem,
  MediaAsset,
  Platform,
  ProviderCatalogItem,
  ScheduledPost,
} from "@brilhio/contracts";
import type { SocialAccountCredentials } from "../../types";

export type PublisherMediaRef = {
  asset: MediaAsset;
  signedUrl: string | null;
};

export type PublisherContext = {
  scheduledPost: ScheduledPost;
  contentItem: ContentItem;
  media: PublisherMediaRef[];
  credentials: SocialAccountCredentials;
  provider: Omit<ProviderCatalogItem, "account">;
};

export type PublisherResult = {
  providerPostId: string;
  mode: "live" | "sandbox";
};

export type Publisher = {
  platform: Platform;
  publish(context: PublisherContext): Promise<PublisherResult>;
};
