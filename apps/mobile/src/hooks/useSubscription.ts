import { useEffect, useState } from "react";
import type Purchases from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";

export const PREMIUM_ENTITLEMENT = "premium";

// Product identifiers — must match what you create in App Store Connect / RevenueCat
export const PRODUCT_IDS = {
  monthly: "worthlane_premium_monthly",
  annual: "worthlane_premium_annual",
} as const;

// EXPO_PUBLIC_* vars are inlined at build time, so this is a static true/false
// per build. Until a real key is configured, react-native-purchases is never
// require()'d — its own module-load side effects (it registers a native
// event listener at import time) have been crashing this app on launch on
// Expo 54 / RN 0.81 / React 19, independent of whether configure() is ever
// called. See https://github.com/RevenueCat/react-native-purchases/issues/1436.
export const REVENUECAT_ENABLED = Boolean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY);

// Lazily loaded only when enabled, so the native module is never touched otherwise.
function getPurchases(): typeof Purchases {
  return require("react-native-purchases").default;
}

let configured = false;

export function configureRevenueCat() {
  if (!REVENUECAT_ENABLED || configured) return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
  const { LOG_LEVEL } = require("react-native-purchases");
  const Purchases = getPurchases();
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;
}

export function useSubscription() {
  // While RevenueCat isn't configured, treat everyone as premium so the AI
  // assistant and bank-connection limit aren't locked behind a paywall
  // nobody can actually pay through. Flip on by setting
  // EXPO_PUBLIC_REVENUECAT_IOS_KEY in the EAS environment.
  const [isPremium, setIsPremium] = useState(!REVENUECAT_ENABLED);
  const [isLoading, setIsLoading] = useState(REVENUECAT_ENABLED);

  useEffect(() => {
    if (!REVENUECAT_ENABLED) return;
    let mounted = true;
    const Purchases = getPurchases();

    Purchases.getCustomerInfo()
      .then((info: CustomerInfo) => {
        if (mounted) {
          setIsPremium(!!info.entitlements.active[PREMIUM_ENTITLEMENT]);
          setIsLoading(false);
        }
      })
      .catch(() => {
        // If RevenueCat isn't configured or network fails, default to free
        if (mounted) setIsLoading(false);
      });

    const listener = (info: CustomerInfo) => {
      if (mounted) {
        setIsPremium(!!info.entitlements.active[PREMIUM_ENTITLEMENT]);
      }
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return { isPremium, isLoading };
}
