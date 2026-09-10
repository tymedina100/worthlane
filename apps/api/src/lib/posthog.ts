import { PostHog } from "posthog-node";

type EventProperties = Record<string, unknown>;

// Financial values, record identifiers and profile updates must never enter
// product analytics. New callers get no new fields without explicit review.
function safeProperties(properties?: EventProperties): EventProperties {
  const safe: EventProperties = {};
  if (properties?.method === "password") safe.method = "password";
  if (typeof properties?.mode === "string" && ["create", "update"].includes(properties.mode)) safe.mode = properties?.mode;
  if (typeof properties?.platform === "string" && ["ios", "android", "web"].includes(properties.platform)) safe.platform = properties?.platform;
  return safe;
}

let client: PostHog | null | undefined;

function getClient() {
  if (client !== undefined) return client;

  const apiKey = process.env.POSTHOG_PROJECT_KEY?.trim();
  if (!apiKey) {
    client = null;
    return client;
  }

  client = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return client;
}

export async function captureServerEvent({
  distinctId,
  event,
  properties,
}: {
  distinctId: string;
  event: string;
  properties?: EventProperties;
}) {
  const posthog = getClient();
  if (!posthog) return;

  try {
    await posthog.captureImmediate({
      distinctId,
      event,
      properties: safeProperties(properties),
      disableGeoip: true,
    });
  } catch (error) {
    console.error("PostHog capture failed; request details omitted.");
  }
}
