import { useEffect, useState } from "react";
import Purchases, { CustomerInfo, LOG_LEVEL } from "react-native-purchases";

export const PREMIUM_ENTITLEMENT = "premium";

// Product identifiers — must match what you create in App Store Connect / RevenueCat
export const PRODUCT_IDS = {
  monthly: "worthlane_premium_monthly",
  annual: "worthlane_premium_annual",
} as const;

let configured = false;

export function configureRevenueCat() {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!apiKey || configured) return;
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;
}

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

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
