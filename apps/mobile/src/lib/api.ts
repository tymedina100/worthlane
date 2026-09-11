import * as SecureStore from "expo-secure-store";
import { fetch as expoFetch } from "expo/fetch";

function resolveApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const isDevelopment = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

  if (!configuredUrl) {
    if (isDevelopment) return "http://localhost:3001/api";
    throw new Error("EXPO_PUBLIC_API_URL is required for preview and production builds.");
  }

  const normalizedUrl = configuredUrl.replace(/\/+$/, "");
  const isLocalhost =
    normalizedUrl.includes("localhost") ||
    normalizedUrl.includes("127.0.0.1") ||
    normalizedUrl.includes("0.0.0.0");

  if (!isDevelopment && isLocalhost) {
    throw new Error("EXPO_PUBLIC_API_URL must point to a deployed API in preview and production builds.");
  }

  return normalizedUrl;
}

const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

// Single-flight: concurrent 401s share one refresh instead of racing each other
// (the second refresh would rotate tokens out from under the first retry).
let refreshInFlight: Promise<string | null> | null = null;
let onSessionExpired: (() => Promise<void>) | undefined;

export function setSessionExpiredHandler(handler: () => Promise<void>): void {
  onSessionExpired = handler;
}

function refreshTokens(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefreshTokens(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) {
    await onSessionExpired?.();
    return null;
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // A rejected refresh ends this login. Temporary server/network failures
    // must preserve credentials so the person can retry when service returns.
    if (res.status === 401 || res.status === 403) {
      if (await SecureStore.getItemAsync("refreshToken") === refreshToken) {
        await onSessionExpired?.();
      }
      return null;
    }
    throw new ApiError("Could not refresh your session. Please try again.", res.status);
  }

  const { data } = await res.json();
  // A response from a previous login must not replace newer credentials.
  if (await SecureStore.getItemAsync("refreshToken") !== refreshToken) {
    return null;
  }
  await SecureStore.setItemAsync("accessToken", data.accessToken);
  await SecureStore.setItemAsync("refreshToken", data.refreshToken);
  return data.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = await getAccessToken();

  const makeRequest = async (t: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
      },
    });

  let res = await makeRequest(token);

  // Auto-refresh on 401
  if (res.status === 401 && !path.startsWith("/auth/")) {
    token = await refreshTokens();
    if (!token) throw new ApiError("Session expired", 401);
    res = await makeRequest(token);
  }

  let json: { data?: T; error?: { message?: string; code?: string } };
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Request failed", res.status);
  }
  if (!res.ok) {
    throw new ApiError(
      json.error?.message ?? "Request failed",
      res.status,
      json.error?.code
    );
  }
  return json.data as T;
}

interface StreamFrame {
  token?: string;
  done?: boolean;
  error?: string;
}

// Consumes a server-sent-event stream (data: {...}\n\n frames) and yields
// text tokens. Uses expo/fetch because React Native's built-in fetch does
// not expose streamed response bodies.
async function* apiStream(path: string, body?: unknown): AsyncGenerator<string> {
  let token = await getAccessToken();

  const makeRequest = (t: string | null) =>
    expoFetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });

  let res = await makeRequest(token);

  if (res.status === 401) {
    token = await refreshTokens();
    if (!token) throw new ApiError("Session expired", 401);
    res = await makeRequest(token);
  }

  if (!res.ok) {
    let message = "Request failed";
    let code: string | undefined;
    try {
      const json = await res.json();
      message = json.error?.message ?? message;
      code = json.error?.code;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status, code);
  }

  if (!res.body) throw new ApiError("Streaming not supported", 500);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          let payload: StreamFrame;
          try {
            payload = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (payload.error) throw new ApiError(payload.error, 502);
          if (payload.done) return;
          if (payload.token) yield payload.token;
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  delete: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  stream: apiStream,
};
