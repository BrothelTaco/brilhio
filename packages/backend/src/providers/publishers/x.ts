import { isSandboxMode, sandboxPublish } from "./sandbox";
import type { Publisher, PublisherMediaRef } from "./types";

const X_TWEET_CREATE_URL =
  process.env.X_TWEET_CREATE_URL ?? "https://api.x.com/2/tweets";
const X_MEDIA_UPLOAD_URL =
  process.env.X_MEDIA_UPLOAD_URL ?? "https://api.x.com/2/media/upload";

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

function xErrorMessage(prefix: string, response: Response, body: Record<string, unknown>) {
  const detail =
    typeof body.detail === "string"
      ? body.detail
      : Array.isArray(body.errors) && body.errors[0] && typeof body.errors[0] === "object"
        ? String(
            (body.errors[0] as Record<string, unknown>).detail ??
              (body.errors[0] as Record<string, unknown>).title ??
              "",
          )
        : "";
  return detail
    ? `${prefix} failed with HTTP ${response.status}: ${detail}`
    : `${prefix} failed with HTTP ${response.status}.`;
}

function mediaTypeForPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";
  return "image/png";
}

async function uploadXImage(accessToken: string, mediaRef: PublisherMediaRef) {
  if (mediaRef.asset.kind !== "image") {
    throw new Error("X live publishing currently supports image media only.");
  }
  if (!mediaRef.signedUrl) {
    throw new Error(`Media asset ${mediaRef.asset.id} does not have a signed URL.`);
  }

  const mediaResponse = await fetch(mediaRef.signedUrl);
  if (!mediaResponse.ok) {
    const body = await mediaResponse.text().catch(() => "");
    throw new Error(
      `Could not download media asset ${mediaRef.asset.id}: HTTP ${mediaResponse.status}${
        body ? ` ${body.slice(0, 200)}` : ""
      }`,
    );
  }

  const mediaType =
    mediaResponse.headers.get("content-type")?.split(";")[0]?.trim() ||
    mediaTypeForPath(mediaRef.asset.storagePath);
  const media = Buffer.from(await mediaResponse.arrayBuffer()).toString("base64");

  const response = await fetch(X_MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      media,
      media_category: "tweet_image",
      media_type: mediaType,
      shared: false,
    }),
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw new Error(xErrorMessage("X media upload", response, json));
  }

  const data = json.data && typeof json.data === "object"
    ? json.data as Record<string, unknown>
    : null;
  const mediaId = typeof data?.id === "string" ? data.id : null;
  if (!mediaId) {
    throw new Error("X media upload did not return a media id.");
  }
  return mediaId;
}

async function createTweet(input: {
  accessToken: string;
  text: string;
  mediaIds: string[];
}) {
  const body: Record<string, unknown> = { text: input.text };
  if (input.mediaIds.length) {
    body.media = { media_ids: input.mediaIds };
  }

  const response = await fetch(X_TWEET_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw new Error(xErrorMessage("X post creation", response, json));
  }

  const data = json.data && typeof json.data === "object"
    ? json.data as Record<string, unknown>
    : null;
  const tweetId = typeof data?.id === "string" ? data.id : null;
  if (!tweetId) {
    throw new Error("X post creation did not return a post id.");
  }
  return tweetId;
}

export const xPublisher: Publisher = {
  platform: "x",
  async publish(context) {
    if (isSandboxMode(context)) return sandboxPublish(context);

    if (!context.credentials.accessToken) {
      throw new Error("X requires an access token before publishing can run.");
    }

    const mediaIds = [];
    for (const mediaRef of context.media) {
      mediaIds.push(await uploadXImage(context.credentials.accessToken, mediaRef));
    }

    const providerPostId = await createTweet({
      accessToken: context.credentials.accessToken,
      text: context.scheduledPost.platformCaption.trim(),
      mediaIds,
    });

    return { providerPostId, mode: "live" };
  },
};
