import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

type SentryExtra = {
  dsn?: unknown;
  environment?: unknown;
};

const isDevelopment = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
const sentryExtra = (Constants.expoConfig?.extra?.sentry ?? null) as SentryExtra | null;
// Expo manifests are runtime data; telemetry configuration must never block launch.
const configString = (value: unknown) => typeof value === "string" ? value.trim() || undefined : undefined;
const dsn = configString(sentryExtra?.dsn) || configString(process.env.EXPO_PUBLIC_SENTRY_DSN);
const environment =
  configString(sentryExtra?.environment) ||
  configString(process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT) ||
  (isDevelopment ? "development" : "production");

const sentryGlobal = globalThis as typeof globalThis & {
  __WORTHLANE_SENTRY_INITIALIZED__?: boolean;
};

// Always call Sentry.init (even with no DSN, where it initializes a disabled
// client). Sentry.wrap() in app/_layout.tsx requires an initialized client;
// skipping init entirely makes Sentry.wrap throw at launch and crashes the app.
// With no DSN, `enabled: false` keeps it inert but valid.
if (!sentryGlobal.__WORTHLANE_SENTRY_INITIALIZED__) {
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment,
    sendDefaultPii: false,
    tracesSampleRate: isDevelopment ? 1.0 : 0.2,
  });

  sentryGlobal.__WORTHLANE_SENTRY_INITIALIZED__ = true;
}

export { Sentry };
