import type PostHog from "posthog-react-native";

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ?? "";
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

export const isPostHogEnabled = Boolean(posthogKey);

// posthog-react-native does native, file-system-backed work in its constructor
// (and captures app lifecycle events at launch). On Expo SDK 54 / iOS that path
// hits deprecated expo-file-system methods that now throw, crashing the app on
// launch as an uncaught Objective-C exception — even when PostHog is disabled.
// So we only ever instantiate the real client when a key is configured, and
// otherwise hand back a no-op stub. Every call site is already gated behind
// `isPostHogEnabled`, so the stub is never actually invoked in production.
function createPostHog(): PostHog {
  if (!isPostHogEnabled) {
    return new Proxy({}, { get: () => () => undefined }) as unknown as PostHog;
  }
  // Required lazily so the native-backed module isn't loaded when disabled.
  const mod = require("posthog-react-native");
  const PostHogClass = (mod.default ?? mod) as typeof import("posthog-react-native").default;
  return new PostHogClass(posthogKey, {
    host: posthogHost,
    captureAppLifecycleEvents: true,
    disableGeoip: false,
  });
}

export const posthog: PostHog = createPostHog();
