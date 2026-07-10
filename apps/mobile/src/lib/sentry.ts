import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

type SentryExtra = {
  dsn?: string | null;
  environment?: string | null;
};

const isDevelopment = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
const sentryExtra = (Constants.expoConfig?.extra?.sentry ?? null) as SentryExtra | null;
const dsn = sentryExtra?.dsn?.trim() || process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const environment =
  sentryExtra?.environment?.trim() ||
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
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
    sendDefaultPii: true,
    tracesSampleRate: isDevelopment ? 1.0 : 0.2,
  });

  sentryGlobal.__WORTHLANE_SENTRY_INITIALIZED__ = true;
}

export { Sentry };
