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
};
