import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function refreshTokens(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const { data } = await res.json();
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
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
      },
    });

  let res = await makeRequest(token);

  // Auto-refresh on 401
  if (res.status === 401) {
    token = await refreshTokens();
    if (!token) throw new Error("Session expired");
    res = await makeRequest(token);
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed");
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),

  /**
   * SSE streaming: yields string tokens from a POST endpoint.
   * Uses XMLHttpRequest + onprogress because React Native's fetch
   * does not expose response.body as a readable stream.
   */
  async *stream(path: string, body: unknown): AsyncGenerator<string> {
    let authToken = await getAccessToken();

    // Run one XHR attempt, collecting all tokens incrementally via onprogress
    const attempt = (t: string | null) =>
      new Promise<{ status: number; tokens: string[]; error?: string }>(
        (resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_URL}${path}`, true);
          xhr.setRequestHeader("Content-Type", "application/json");
          if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);
          xhr.timeout = 60_000;

          const tokens: string[] = [];
          let consumed = 0;
          let buffer = "";
          let settled = false;

          const flush = () => {
            const newText = xhr.responseText.slice(consumed);
            consumed = xhr.responseText.length;
            buffer += newText;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (!payload) continue;
              try {
                const parsed = JSON.parse(payload) as {
                  token?: string;
                  done?: boolean;
                  error?: string;
                };
                if (parsed.error) {
                  if (!settled) { settled = true; resolve({ status: xhr.status, tokens, error: parsed.error }); }
                  return;
                }
                if (parsed.done) return;
                if (parsed.token) tokens.push(parsed.token);
              } catch { /* skip malformed */ }
            }
          };

          xhr.onprogress = flush;
          xhr.onload = () => { flush(); if (!settled) { settled = true; resolve({ status: xhr.status, tokens }); } };
          xhr.onerror = () => { if (!settled) { settled = true; resolve({ status: 0, tokens, error: "Network error" }); } };
          xhr.ontimeout = () => { if (!settled) { settled = true; resolve({ status: 0, tokens, error: "Request timed out" }); } };

          xhr.send(JSON.stringify(body));
        }
      );

    let result = await attempt(authToken);

    // Auto-refresh on 401
    if (result.status === 401) {
      authToken = await refreshTokens();
      if (!authToken) throw new Error("Session expired");
      result = await attempt(authToken);
    }

    if (result.error) throw new Error(result.error);

    for (const t of result.tokens) {
      yield t;
    }
  },
};
