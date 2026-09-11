import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api, setSessionExpiredHandler } from "@/lib/api";
import { isPostHogEnabled, posthog } from "@/lib/posthog";
import { clearPrivateQueryCache } from "@/lib/query-client";

import { setReminderSession } from "@/lib/obligation-reminders";

interface AuthState {
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  biometricEnabled: boolean;
  rememberedEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => Promise<void>;
  hydrate: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  setRememberedEmail: (email: string | null) => Promise<void>;
  registerPushToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  isLoading: true,
  biometricEnabled: false,
  rememberedEmail: null,

  expireSession: async () => {
    const cleanup = setReminderSession(null).catch(() => {});
    // Remove the signed-in UI immediately; do not call the logout endpoint
    // from a rejected refresh or recursively attempt another refresh.
    set({ userId: null, email: null });
    if (isPostHogEnabled) {
      try { posthog.reset(); } catch { /* Local privacy cleanup still runs. */ }
    }
    await clearPrivateQueryCache();
    for (const key of ["accessToken", "refreshToken", "userId", "userEmail"]) {
      await SecureStore.deleteItemAsync(key);
    }
    await cleanup;
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    const email = await SecureStore.getItemAsync("userEmail");
    const userId = await SecureStore.getItemAsync("userId");
    const biometricEnabled = (await SecureStore.getItemAsync("biometricEnabled")) === "true";
    const rememberedEmail = (await SecureStore.getItemAsync("rememberedEmail")) ?? null;
    await setReminderSession(token && userId ? userId : null);
    if (token && userId) {
      if (isPostHogEnabled) {
        try { posthog.identify(userId); } catch { /* Optional analytics cannot block sign-in. */ }
      }
      set({ userId, email, isLoading: false, biometricEnabled, rememberedEmail });
    } else {
      set({ isLoading: false, biometricEnabled, rememberedEmail });
    }
  },

  login: async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await api.post<{
      user: { id: string; email: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", { email, password });

    await setReminderSession(user.id);
    await clearPrivateQueryCache();
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    await SecureStore.setItemAsync("userId", user.id);
    await SecureStore.setItemAsync("userEmail", user.email);
    if (isPostHogEnabled) {
      try { posthog.identify(user.id); } catch { /* Optional analytics cannot block sign-in. */ }
    }
    set({ userId: user.id, email: user.email });
    // Notification permission is requested only when the person enables a
    // reminder in V1 Settings or saves an upcoming item with reminders.
  },

  register: async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await api.post<{
      user: { id: string; email: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/register", { email, password });

    await setReminderSession(user.id);
    await clearPrivateQueryCache();
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    await SecureStore.setItemAsync("userId", user.id);
    await SecureStore.setItemAsync("userEmail", user.email);
    if (isPostHogEnabled) {
      try { posthog.identify(user.id); } catch { /* Optional analytics cannot block sign-in. */ }
    }
    set({ userId: user.id, email: user.email });
    // Notification permission is requested contextually from V1 reminders.
  },

  logout: async () => {
    // Invalidate pending schedules immediately, before network logout.
    const reminderCleanup = setReminderSession(null);
    const cleanupResult = reminderCleanup.then(() => null, error => error as Error);
    if (isPostHogEnabled) {
      // Logging out must not wait for a telemetry network request. Clear the
      // analytics identity even if recording the event fails.
      try { posthog.capture("user logged out"); } catch { /* Nonessential. */ }
      try { posthog.reset(); } catch { /* Continue clearing auth credentials. */ }
    }
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // Local logout must still complete if the network is unavailable. The
        // server session expires automatically after 30 days at the latest.
      }
    }
    await clearPrivateQueryCache();
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("userId");
    await SecureStore.deleteItemAsync("userEmail");
    set({ userId: null, email: null });
    const cleanupError = await cleanupResult;
    if (cleanupError) throw new Error("Signed out. Device reminder cleanup failed; clear Worthlane notifications in device settings.");
  },

  enableBiometric: async () => {
    await SecureStore.setItemAsync("biometricEnabled", "true");
    set({ biometricEnabled: true });
  },

  disableBiometric: async () => {
    await SecureStore.setItemAsync("biometricEnabled", "false");
    set({ biometricEnabled: false });
  },

  loginWithBiometric: async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Sign in to Worthlane",
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error("Biometric authentication failed");
    }

    // Tokens are already stored — hydrate auth state from SecureStore.
    // If the access token is expired, api.ts will auto-refresh via the stored refresh token.
    const userId = await SecureStore.getItemAsync("userId");
    const email = await SecureStore.getItemAsync("userEmail");
    if (!userId) {
      throw new Error("No stored credentials. Please sign in with your password.");
    }
    if (isPostHogEnabled) {
      try {
        posthog.identify(userId);
        posthog.capture("user logged in", { method: "biometric" });
      } catch { /* Optional analytics cannot block sign-in. */ }
    }
    await setReminderSession(userId);
    set({ userId, email });
  },

  setRememberedEmail: async (email: string | null) => {
    if (email) {
      await SecureStore.setItemAsync("rememberedEmail", email);
    } else {
      await SecureStore.deleteItemAsync("rememberedEmail");
    }
    set({ rememberedEmail: email });
  },

  registerPushToken: async () => {
    // Android requires a notification channel; iOS shows a permission dialog
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.post("/push/register", { token });
  },
}));

setSessionExpiredHandler(() => useAuthStore.getState().expireSession());
