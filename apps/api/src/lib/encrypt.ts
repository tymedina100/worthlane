import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not set");
  // Derive a stable 32-byte key from the env var string
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypts a plaintext string. Returns a string prefixed with "enc:" so it can
 * be detected and decrypted later. Safe to store in the DB accessToken column.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: enc:<iv_hex>.<tag_hex>.<data_hex>
  return `enc:${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value produced by `encrypt`. If the value does not start with
 * "enc:" it is returned as-is (plaintext fallback for legacy unencrypted rows).
 */
export function decrypt(value: string): string {
  if (!value.startsWith("enc:")) return value; // legacy plaintext
  const rest = value.slice(4);
  const [ivHex, tagHex, dataHex] = rest.split(".");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted token format");
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(dataHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}
