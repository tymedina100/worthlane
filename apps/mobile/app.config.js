const baseConfig = require("./app.json").expo;

function requireReleaseEnv(name, value) {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for preview and production builds.`);
  }
  return value.trim();
}

module.exports = () => {
  const easBuildProfile = process.env.EAS_BUILD_PROFILE ?? "development";
  const isSandboxPreview = easBuildProfile === "sandbox-preview";
  const isReleaseProfile = isSandboxPreview || easBuildProfile === "preview" || easBuildProfile === "production";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const associatedDomain = process.env.PLAID_IOS_ASSOCIATED_DOMAIN?.trim();
  const appleTeamId = (process.env.APPLE_TEAM_ID || baseConfig.ios?.appleTeamId)?.trim();
  if (associatedDomain && !appleTeamId) {
    throw new Error("APPLE_TEAM_ID is required when PLAID_IOS_ASSOCIATED_DOMAIN is configured; it must match the website association.");
  }
  if (appleTeamId && !/^[A-Z0-9]{10}$/.test(appleTeamId)) {
    throw new Error("APPLE_TEAM_ID must be the 10-character Apple development team ID.");
  }
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  const sentryEnvironment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim();
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
  const sentryOrganization = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  const sentryUrl = process.env.SENTRY_URL?.trim() || "https://sentry.io/";

  const plaidEnabled = process.env.EXPO_PUBLIC_PLAID_ENABLED === "true";

  // A test artifact must never silently inherit production endpoints or SDKs.
  if (isSandboxPreview) {
    const expected = {
      EXPO_NO_DOTENV: "1",
      EXPO_PUBLIC_API_URL: "https://worthlane-beta-sandbox.up.railway.app/api",
      EXPO_PUBLIC_PLAID_ENABLED: "true",
      PLAID_IOS_ASSOCIATED_DOMAIN: "worthlane.app",
      APPLE_TEAM_ID: "5FBXR5M5PJ",
      EXPO_PUBLIC_ENABLE_AI: "false",
      EXPO_PUBLIC_ENABLE_PAYWALL: "false",
    };
    for (const [name, value] of Object.entries(expected)) {
      if (process.env[name]?.trim() !== value) {
        throw new Error(`${name} must match the isolated sandbox-preview configuration.`);
      }
    }
    for (const name of ["EXPO_PUBLIC_POSTHOG_KEY", "EXPO_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_AUTH_TOKEN"]) {
      if (process.env[name]?.trim()) {
        throw new Error(`${name} must be empty for sandbox-preview.`);
      }
    }
  }

  if (isReleaseProfile) {
    const releaseApiUrl = requireReleaseEnv("EXPO_PUBLIC_API_URL", apiUrl);
    let releaseUrl;
    try {
      releaseUrl = new URL(releaseApiUrl);
    } catch {
      throw new Error("EXPO_PUBLIC_API_URL must be a valid HTTPS URL in preview and production builds.");
    }
    const host = releaseUrl.hostname.toLowerCase();
    // Release credentials must never travel over HTTP or to a development host.
    // Require a DNS host; this also excludes emulator aliases and private IPs.
    if (releaseUrl.protocol !== "https:" || releaseUrl.username || releaseUrl.password ||
        releaseUrl.search || releaseUrl.hash || !host.includes(".") ||
        /^[\d.]+$/.test(host) || host.includes(":") ||
        /(^|\.)(localhost|local|test|invalid)$/.test(host)) {
      throw new Error("EXPO_PUBLIC_API_URL must use HTTPS and a deployed DNS host without credentials, query, or fragment in preview and production builds.");
    }
    // The Plaid OAuth associated domain only matters once bank linking is
    // actually enabled; Sentry is observability, not a functional
    // requirement — both are optional so a release build isn't blocked on
    // integrations that haven't been set up yet (see the optional
    // sentryPlugin/associatedDomains handling below, which already treats
    // them as optional).
    if (plaidEnabled) {
      requireReleaseEnv("PLAID_IOS_ASSOCIATED_DOMAIN", associatedDomain);
    }
  }

  const normalizedAssociatedDomain = associatedDomain
    ? `applinks:${associatedDomain.replace(/^applinks:/, "")}`
    : undefined;

  const sentryPlugin =
    sentryOrganization && sentryProject
      ? [
          [
            "@sentry/react-native/expo",
            {
              url: sentryUrl,
              organization: sentryOrganization,
              project: sentryProject,
            },
          ],
        ]
      : [];

  return {
    ...baseConfig,
    scheme: [baseConfig.scheme, "com.worthlane.mobile"],
    plugins: [...(baseConfig.plugins ?? []), ["expo-build-properties", { android: { minSdkVersion: 26 } }], ...sentryPlugin],
    ios: {
      ...baseConfig.ios,
      appleTeamId,
      associatedDomains: normalizedAssociatedDomain
        ? Array.from(
            new Set([
              ...(baseConfig.ios?.associatedDomains ?? []),
              normalizedAssociatedDomain,
            ])
          )
        : baseConfig.ios?.associatedDomains,
    },
    extra: {
      ...baseConfig.extra,
      plaid: {
        iosAssociatedDomain: associatedDomain ?? null,
      },
      sentry: {
        dsn: sentryDsn ?? null,
        environment: sentryEnvironment ?? easBuildProfile,
      },
    },
  };
};
