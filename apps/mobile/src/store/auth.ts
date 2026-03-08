import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api } from "@/lib/api";

interface AuthState {
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  isLoading: true,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    const email = await SecureStore.getItemAsync("userEmail");
    const userId = await SecureStore.getItemAsync("userId");
    if (token && userId) {
      set({ userId, email, isLoading: false });
    } else {
      set({ isLoading: false });
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
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("userId");
    await SecureStore.deleteItemAsync("userEmail");
    set({ userId: null, email: null });
  },
}));
