const baseConfig = require("./app.json").expo;

function requireReleaseEnv(name, value) {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for preview and production builds.`);
  }
  return value.trim();
}

module.exports = () => {
  const easBuildProfile = process.env.EAS_BUILD_PROFILE ?? "development";
  const isReleaseProfile = easBuildProfile === "preview" || easBuildProfile === "production";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const associatedDomain = process.env.PLAID_IOS_ASSOCIATED_DOMAIN?.trim();
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  const sentryEnvironment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim();
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
  const sentryOrganization = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  const sentryUrl = process.env.SENTRY_URL?.trim() || "https://sentry.io/";

  if (isReleaseProfile) {
    const releaseApiUrl = requireReleaseEnv("EXPO_PUBLIC_API_URL", apiUrl);
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(releaseApiUrl)) {
      throw new Error("EXPO_PUBLIC_API_URL must point to a deployed API in preview and production builds.");
    }
    requireReleaseEnv("PLAID_IOS_ASSOCIATED_DOMAIN", associatedDomain);
    requireReleaseEnv("EXPO_PUBLIC_SENTRY_DSN", sentryDsn);
    requireReleaseEnv("SENTRY_AUTH_TOKEN", sentryAuthToken);
    requireReleaseEnv("SENTRY_ORG", sentryOrganization);
    requireReleaseEnv("SENTRY_PROJECT", sentryProject);
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
    plugins: [...(baseConfig.plugins ?? []), ...sentryPlugin],
    ios: {
      ...baseConfig.ios,
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
