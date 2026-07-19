"use strict";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const EXTERNAL_PATHS = new Set(["/privacy", "/support", "/terms"]);

function parseConfiguredUrl(rawValue, { allowLocal = false } = {}) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    throw new Error("WORTHLANE_DESKTOP_URL is required.");
  }

  let parsed;
  try {
    parsed = new URL(rawValue.trim());
  } catch {
    throw new Error("WORTHLANE_DESKTOP_URL must be a valid absolute URL.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("WORTHLANE_DESKTOP_URL cannot include credentials.");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("WORTHLANE_DESKTOP_URL cannot include a query string or fragment.");
  }
  if (parsed.pathname.replace(/\/+$/, "") !== "") {
    throw new Error("WORTHLANE_DESKTOP_URL must be an origin without a path.");
  }

  const isLocalDevelopmentUrl =
    allowLocal && parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLocalDevelopmentUrl) {
    throw new Error("Production desktop builds require an HTTPS app URL.");
  }

  parsed.pathname = "/";
  return Object.freeze({ href: parsed.toString(), origin: parsed.origin });
}

function parsePackagedConfiguration(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The packaged desktop configuration is invalid.");
  }
  return parseConfiguredUrl(payload.appUrl, {
    allowLocal: payload.developmentOnly === true,
  });
}

function isAllowedNavigation(candidate, configuredOrigin) {
  try {
    const parsed = new URL(candidate);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !parsed.username &&
      !parsed.password &&
      parsed.origin === configuredOrigin
    );
  } catch {
    return false;
  }
}

function isAllowedConnectionPageNavigation(candidate, connectionPageUrl) {
  try {
    const parsed = new URL(candidate);
    parsed.search = "";
    parsed.hash = "";
    return parsed.protocol === "file:" && parsed.toString() === connectionPageUrl;
  } catch {
    return false;
  }
}

function isSafeExternalUrl(candidate) {
  try {
    const parsed = new URL(candidate);
    const hostAllowed = parsed.hostname === "worthlane.app" || parsed.hostname === "www.worthlane.app";
    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    return (
      parsed.protocol === "https:" &&
      hostAllowed &&
      EXTERNAL_PATHS.has(normalizedPath) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

module.exports = {
  isAllowedConnectionPageNavigation,
  isAllowedNavigation,
  isSafeExternalUrl,
  parseConfiguredUrl,
  parsePackagedConfiguration,
};
