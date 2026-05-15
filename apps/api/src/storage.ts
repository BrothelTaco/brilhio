import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import type { AppConfig } from "./context";

const allowedContentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export type R2Storage = {
  mode: "r2";
  bucket: string;
  maxFileSizeBytes: number;
  createUploadUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
  }): Promise<{ url: string; expiresAt: string }>;
  createReadUrl(input: {
    key: string;
    responseContentType?: string | null;
  }): Promise<{ url: string; expiresAt: string }>;
  getObject(input: {
    key: string;
  }): Promise<{
    body: Readable;
    contentLength: number | null;
    contentType: string | null;
  }>;
};

export type MemoryStorage = {
  mode: "memory";
  bucket: string;
  maxFileSizeBytes: number;
};

export type MediaStorage = R2Storage | MemoryStorage;

export function isAllowedMediaContentType(contentType: string) {
  return allowedContentTypes.has(contentType.toLowerCase());
}

export function createMediaStorage(config: AppConfig): MediaStorage {
  if (
    !config.r2Endpoint ||
    !config.r2AccessKeyId ||
    !config.r2SecretAccessKey ||
    !config.storageBucket
  ) {
    return {
      mode: "memory",
      bucket: config.storageBucket,
      maxFileSizeBytes: config.mediaMaxFileSizeBytes,
    };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: config.r2Endpoint,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });

  const expiresIn = config.r2SignedUrlTtlSeconds;

  return {
    mode: "r2",
    bucket: config.storageBucket,
    maxFileSizeBytes: config.mediaMaxFileSizeBytes,
    async createUploadUrl(input) {
      const command = new PutObjectCommand({
        Bucket: config.storageBucket,
        Key: input.key,
        ContentType: input.contentType,
      });
      const url = await getSignedUrl(client, command, { expiresIn });
      return { url, expiresAt: expiresAtFromNow(expiresIn) };
    },
    async createReadUrl(input) {
      const command = new GetObjectCommand({
        Bucket: config.storageBucket,
        Key: input.key,
        ResponseContentType: input.responseContentType ?? undefined,
      });
      const url = await getSignedUrl(client, command, { expiresIn });
      return { url, expiresAt: expiresAtFromNow(expiresIn) };
    },
    async getObject(input) {
      const output = await client.send(new GetObjectCommand({
        Bucket: config.storageBucket,
        Key: input.key,
      }));

      if (!output.Body) {
        throw new Error("R2 object did not include a response body.");
      }

      return {
        body: output.Body as Readable,
        contentLength: output.ContentLength ?? null,
        contentType: output.ContentType ?? null,
      };
    },
  };
}

function expiresAtFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
