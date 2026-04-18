import { randomUUID } from "node:crypto";
import type { Platform, ProviderCatalogItem } from "@ritmio/contracts";

export const providerCatalog: Array<Omit<ProviderCatalogItem, "account">> = [
  {
    platform: "instagram",
    displayName: "Instagram",
    description: "Short-form visual publishing with image, video, and carousel support.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["image", "video", "carousel"],
  },
  {
    platform: "tiktok",
    displayName: "TikTok",
    description: "Video-first publishing tuned for short-form discovery loops.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["video"],
  },
  {
    platform: "facebook",
    displayName: "Facebook",
    description: "Community publishing for page updates, launches, and mixed media campaigns.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["image", "video", "carousel", "document"],
  },
  {
    platform: "x",
    displayName: "X",
    description: "Text-led distribution for updates, launch threads, and short commentary.",
    connectionMode: "manual",
    publishMode: "sandbox",
    supportedAssetKinds: ["image", "video"],
  },
];

export function getProviderDefinition(platform: Platform) {
  return providerCatalog.find((provider) => provider.platform === platform) ?? null;
}

export function createSandboxProviderPostId(platform: Platform) {
  return `${platform}-sandbox-${randomUUID().slice(0, 12)}`;
}
