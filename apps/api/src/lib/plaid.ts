import crypto from "crypto";
import {
  Configuration,
  CountryCode,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
  TransactionsSyncResponse,
} from "plaid";

type PlaidPlatform = "ios" | "android";
type PlaidLinkMode = "create" | "update";

const plaidEnv = process.env.PLAID_ENV;
if (!plaidEnv || !(plaidEnv in PlaidEnvironments)) {
  throw new Error(
    `PLAID_ENV must be set to one of: ${Object.keys(PlaidEnvironments).join(", ")}. Got: ${JSON.stringify(plaidEnv)}`
  );
}

const config = new Configuration({
  basePath: PlaidEnvironments[plaidEnv as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(config);

const RELINK_ERROR_CODES = new Set([
  "ITEM_LOGIN_REQUIRED",
  "INVALID_UPDATED_USERNAME",
  "INVALID_UPDATED_PASSWORD",
  "INVALID_MFA",
  "USER_PERMISSION_REVOKED",
]);

export class PlaidIntegrationError extends Error {
  status: number;
  code: string;
  detail: string | null;
  needsRelink: boolean;

  constructor(
    message: string,
    {
      status = 502,
      code = "PLAID_ERROR",
      detail = null,
      needsRelink = false,
    }: {
      status?: number;
      code?: string;
      detail?: string | null;
      needsRelink?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "PlaidIntegrationError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.needsRelink = needsRelink;
  }
}

function getTokenEncryptionKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is required for Plaid token encryption.");
  }

  const decoded =
    /^[0-9a-f]{64}$/i.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "utf8");

  return decoded.length === 32 ? decoded : crypto.createHash("sha256").update(decoded).digest();
}

function requireIosRedirectUri(): string {
  const redirectUri = process.env.PLAID_IOS_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("PLAID_IOS_REDIRECT_URI is required for iOS Plaid Link.");
  }
  return redirectUri;
}

function requireAndroidPackageName(): string {
  const packageName = process.env.PLAID_ANDROID_PACKAGE_NAME;
  if (!packageName) {
    throw new Error("PLAID_ANDROID_PACKAGE_NAME is required for Android Plaid Link.");
  }
  return packageName;
}

function getWebhookUrl(): string | undefined {
  return process.env.PLAID_WEBHOOK_URL || undefined;
}

function mapPlaidErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case "ITEM_LOGIN_REQUIRED":
    case "USER_PERMISSION_REVOKED":
      return "Your bank connection needs to be re-linked.";
    case "INSTITUTION_DOWN":
    case "INSTITUTION_NOT_RESPONDING":
      return "Your institution is temporarily unavailable. Please try again later.";
    case "INVALID_LINK_TOKEN":
      return "Your bank-link session expired. Please try connecting again.";
    case "NO_ACCOUNTS":
      return "Plaid did not return any supported accounts for this institution.";
    default:
      return fallback;
  }
}

export function toPlaidIntegrationError(
  error: unknown,
  fallback = "Plaid is temporarily unavailable."
): PlaidIntegrationError {
  if (error instanceof PlaidIntegrationError) return error;

  const payload = (error as { response?: { data?: any } })?.response?.data;
  const code = payload?.error_code ?? payload?.code ?? "PLAID_ERROR";
  const detail = payload?.error_message ?? payload?.message ?? null;
  const needsRelink = RELINK_ERROR_CODES.has(code);

  return new PlaidIntegrationError(
    mapPlaidErrorMessage(code, fallback),
    {
      status:
        code === "INVALID_LINK_TOKEN"
          ? 400
          : needsRelink
          ? 409
          : code === "NO_ACCOUNTS"
          ? 422
          : 502,
      code,
      detail,
      needsRelink,
    }
  );
}

export function encryptPlaidAccessToken(accessToken: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((part) => part.toString("base64")).join(".");
}

export function decryptPlaidAccessToken(encryptedToken: string): string {
  const [ivRaw, authTagRaw, encryptedRaw] = encryptedToken.split(".");
  if (!ivRaw || !authTagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted Plaid token payload.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getTokenEncryptionKey(),
    Buffer.from(ivRaw, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagRaw, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function createLinkToken(
  userId: string,
  options: {
    platform: PlaidPlatform;
    mode: PlaidLinkMode;
    accessToken?: string;
  }
) {
  const request: LinkTokenCreateRequest = {
    user: { client_user_id: userId },
    client_name: "Worthlane",
    products: options.mode === "create" ? [Products.Transactions] : undefined,
    country_codes: [CountryCode.Us],
    language: "en",
    webhook: getWebhookUrl(),
    transactions: { days_requested: 730 },
  };

  if (options.platform === "ios") {
    request.redirect_uri = requireIosRedirectUri();
  } else {
    request.android_package_name = requireAndroidPackageName();
  }

  if (options.mode === "update") {
    if (!options.accessToken) {
      throw new Error("An access token is required to create an update-mode Plaid link token.");
    }
    request.access_token = options.accessToken;
    request.update = { account_selection_enabled: true };
  }

  try {
    const response = await plaidClient.linkTokenCreate(request);
    return response.data.link_token;
  } catch (error) {
    throw toPlaidIntegrationError(error, "Could not start bank linking right now.");
  }
}

export async function exchangePublicToken(publicToken: string) {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (error) {
    throw toPlaidIntegrationError(error, "Could not finish bank linking right now.");
  }
}

export async function syncTransactions(accessToken: string, cursor?: string) {
  try {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      options: { include_personal_finance_category: true },
    });
    return response.data as TransactionsSyncResponse;
  } catch (error) {
    throw toPlaidIntegrationError(error, "Could not sync this institution right now.");
  }
}

export async function refreshTransactions(accessToken: string) {
  try {
    await plaidClient.transactionsRefresh({ access_token: accessToken });
  } catch (error) {
    throw toPlaidIntegrationError(error, "Could not refresh this institution right now.");
  }
}

export async function getAccounts(accessToken: string) {
  try {
    const response = await plaidClient.accountsGet({ access_token: accessToken });
    return response.data.accounts;
  } catch (error) {
    throw toPlaidIntegrationError(error, "Could not load institution accounts right now.");
  }
}

export async function removeItem(accessToken: string) {
  try {
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch (error) {
    throw toPlaidIntegrationError(error, "Could not unlink this institution right now.");
  }
}
