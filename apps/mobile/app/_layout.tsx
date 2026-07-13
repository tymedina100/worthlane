import { useEffect } from "react";
import { Stack, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Sentry } from "@/lib/sentry";
import { isPostHogEnabled, posthog } from "@/lib/posthog";
import { useAuthStore } from "@/store/auth";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { configureRevenueCat } from "@/hooks/useSubscription";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ThemedApp() {
  const { colors, scheme } = useTheme();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AnalyticsScreenTracker />
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="quick-add" options={{ presentation: "modal" }} />
          <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
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
