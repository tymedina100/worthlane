import { useEffect } from "react";
import { Stack, usePathname } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { Sentry } from "@/lib/sentry";
import { isPostHogEnabled, posthog } from "@/lib/posthog";
import { useAuthStore } from "@/store/auth";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { configureRevenueCat } from "@/hooks/useSubscription";
import { queryClient } from "@/lib/query-client";
import { ReminderSync } from "@/components/ReminderSync";

function ThemedApp() {
  const { colors, scheme } = useTheme();
  const { userId, isLoading } = useAuthStore();

  if (isLoading) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AnalyticsScreenTracker />
        <ReminderSync />
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Protected guard={!!userId}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="household" />
            <Stack.Screen name="debt-plans" />
            <Stack.Screen name="accounts" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="duplicate-review" />
            <Stack.Screen name="recurring" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="quick-add" options={{ presentation: "modal" }} />
            <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    configureRevenueCat();
  }, []);

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function AnalyticsScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPostHogEnabled || !pathname) return;
    posthog.screen(pathname);
  }, [pathname]);

  return null;
}

export default Sentry.wrap(RootLayout);
