import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_SIZE = 12;

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string, secret: string) {
  const iv = randomBytes(IV_SIZE);
  const key = deriveKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string, secret: string) {
  const parts = value.split(".");

  if (parts.length !== 3) {
    return value;
  }

  const ivPart = parts[0];
  const authTagPart = parts[1];
  const encryptedPart = parts[2];

  if (!ivPart || !authTagPart || !encryptedPart) {
    return value;
  }

  const key = deriveKey(secret);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
