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

  const plaidEnabled = process.env.EXPO_PUBLIC_PLAID_ENABLED === "true";

  if (isReleaseProfile) {
    const releaseApiUrl = requireReleaseEnv("EXPO_PUBLIC_API_URL", apiUrl);
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(releaseApiUrl)) {
      throw new Error("EXPO_PUBLIC_API_URL must point to a deployed API in preview and production builds.");
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
