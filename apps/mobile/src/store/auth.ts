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
  startupError: string | null;
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

let hydrationAttempt = 0;

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  isLoading: true,
  startupError: null,
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
    const attempt = ++hydrationAttempt;
    set({ isLoading: true, startupError: null, userId: null, email: null });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const saved = await Promise.race([
        (async () => {
          const [token, email, userId, biometric, rememberedEmail] = await Promise.all([
            SecureStore.getItemAsync("accessToken"),
            SecureStore.getItemAsync("userEmail"),
            SecureStore.getItemAsync("userId"),
            SecureStore.getItemAsync("biometricEnabled"),
            SecureStore.getItemAsync("rememberedEmail"),
          ]);
          // A timed-out or superseded read cannot change the notification owner.
          if (attempt !== hydrationAttempt) throw new Error("Superseded startup");
          await setReminderSession(token && userId ? userId : null);
          return { token, email, userId, biometricEnabled: biometric === "true", rememberedEmail: rememberedEmail ?? null };
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Startup timed out")), 15000);
        }),
      ]);
      if (attempt !== hydrationAttempt) return;
      if (saved.token && saved.userId && isPostHogEnabled) {
        try { posthog.identify(saved.userId); } catch { /* Optional analytics cannot block sign-in. */ }
      }
      set({
        userId: saved.token && saved.userId ? saved.userId : null,
        email: saved.token && saved.userId ? saved.email : null,
        isLoading: false,
        startupError: null,
        biometricEnabled: saved.biometricEnabled,
        rememberedEmail: saved.rememberedEmail,
      });
    } catch {
      if (attempt !== hydrationAttempt) return;
      hydrationAttempt++;
      set({ isLoading: false, userId: null, email: null, startupError: "Your saved session could not be opened. Your saved data has not been changed. Try again when your device is ready." });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
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
