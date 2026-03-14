import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "@/lib/api";

interface AuthState {
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  rememberedEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  setRememberedEmail: (email: string | null) => Promise<void>;
  registerPushToken: () => Promise<void>;
  deregisterPushToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  isLoading: true,
  biometricEnabled: false,
  notificationsEnabled: true,
  rememberedEmail: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    const email = await SecureStore.getItemAsync("userEmail");
    const userId = await SecureStore.getItemAsync("userId");
    const biometricEnabled = (await SecureStore.getItemAsync("biometricEnabled")) === "true";
    const notificationsEnabled = (await SecureStore.getItemAsync("notificationsEnabled")) !== "false";
    const rememberedEmail = (await SecureStore.getItemAsync("rememberedEmail")) ?? null;
    if (token && userId) {
      set({ userId, email, isLoading: false, biometricEnabled, notificationsEnabled, rememberedEmail });
    } else {
      set({ isLoading: false, biometricEnabled, notificationsEnabled, rememberedEmail });
    }
  },

  login: async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await api.post<{
      user: { id: string; email: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", { email, password });

    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    await SecureStore.setItemAsync("userId", user.id);
    await SecureStore.setItemAsync("userEmail", user.email);
    set({ userId: user.id, email: user.email });
    // Fire-and-forget — don't block login on push permission
    useAuthStore.getState().registerPushToken().catch(() => {});
  },

  register: async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await api.post<{
      user: { id: string; email: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/register", { email, password });

    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    await SecureStore.setItemAsync("userId", user.id);
    await SecureStore.setItemAsync("userEmail", user.email);
    set({ userId: user.id, email: user.email });
    useAuthStore.getState().registerPushToken().catch(() => {});
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("userId");
    await SecureStore.deleteItemAsync("userEmail");
    set({ userId: null, email: null });
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
      promptMessage: "Sign in to Vantage",
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
    if (finalStatus !== "granted") {
      throw new Error("Please enable notifications for Vantage in your device Settings.");
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.post("/push/register", { token });
    await SecureStore.setItemAsync("notificationsEnabled", "true");
    set({ notificationsEnabled: true });
  },

  deregisterPushToken: async () => {
    await api.delete("/push/register");
    await SecureStore.setItemAsync("notificationsEnabled", "false");
    set({ notificationsEnabled: false });
  },
}));
