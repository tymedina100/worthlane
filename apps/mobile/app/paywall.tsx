import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useEffect } from "react";
import { PREMIUM_ENTITLEMENT, PRODUCT_IDS } from "@/hooks/useSubscription";
import { spacing, radius } from "@/lib/theme";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";

const FEATURES = [
  { icon: "sparkles", label: "Worthlane AI", description: "Ask anything about your finances, anytime" },
  { icon: "wallet", label: "Unlimited bank connections", description: "Sync as many institutions as you need" },
  { icon: "trending-up", label: "Full dashboard insights", description: "Net worth, streaks, nudges & more" },
  { icon: "shield-checkmark", label: "Priority support", description: "Get help when you need it" },
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        const pkgs = offerings.current?.availablePackages ?? [];
        setPackages(pkgs);
      })
      .catch(() => {
        // Packages unavailable — still show UI, purchase will fail gracefully
      });
  }, []);

  const selectedPackage = packages.find((pkg) =>
    selected === "monthly"
      ? pkg.product.identifier === PRODUCT_IDS.monthly
      : pkg.product.identifier === PRODUCT_IDS.annual
  );

  const monthlyPackage = packages.find((p) => p.product.identifier === PRODUCT_IDS.monthly);
  const annualPackage = packages.find((p) => p.product.identifier === PRODUCT_IDS.annual);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert("Unavailable", "Subscription products aren't available right now. Please try again later.");
      return;
    }

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      if (customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]) {
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase failed", "Something went wrong. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active[PREMIUM_ENTITLEMENT]) {
        Alert.alert("Restored", "Your Premium subscription has been restored.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Nothing to restore", "No active subscription found for this Apple ID.");
      }
    } catch {
      Alert.alert("Restore failed", "Please try again later.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={32} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Worthlane Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the full power of your financial co-pilot.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.planRow}>
          <TouchableOpacity
            style={[styles.planCard, selected === "annual" && styles.planCardSelected]}
            onPress={() => setSelected("annual")}
            activeOpacity={0.8}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <Text style={styles.planName}>Annual</Text>
            <Text style={styles.planPrice}>
              {annualPackage ? annualPackage.product.priceString : "$39.99"}
            </Text>
            <Text style={styles.planPer}>per year</Text>
            {annualPackage && (
              <Text style={styles.planSavings}>
                {monthlyPackage
                  ? `Save ${Math.round((1 - annualPackage.product.price / (monthlyPackage.product.price * 12)) * 100)}%`
                  : "Save 33%"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selected === "monthly" && styles.planCardSelected]}
            onPress={() => setSelected("monthly")}
            activeOpacity={0.8}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>
              {monthlyPackage ? monthlyPackage.product.priceString : "$4.99"}
            </Text>
            <Text style={styles.planPer}>per month</Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.ctaText}>
              Subscribe {selected === "annual" ? "Annually" : "Monthly"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          Payment charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>

        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreButton}>
          <Text style={styles.restoreText}>{restoring ? "Restoring..." : "Restore purchases"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  closeButton: {
    position: "absolute",
    top: 56,
    right: spacing.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  hero: { alignItems: "center", marginBottom: spacing.xl, marginTop: spacing.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.h2, marginBottom: spacing.sm },
  heroSubtitle: { ...typography.bodySmall, textAlign: "center", paddingHorizontal: spacing.lg },

  featureList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { ...typography.label },
  featureDesc: { ...typography.caption, marginTop: 2 },

  planRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
    gap: 4,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  bestValueBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  bestValueText: { fontSize: 10, fontWeight: "800", color: colors.bg, letterSpacing: 0.5 },
  planName: { ...typography.label },
  planPrice: { fontSize: 22, fontWeight: "700", color: colors.text },
  planPer: { ...typography.caption },
  planSavings: { fontSize: 12, fontWeight: "600", color: colors.primary, marginTop: 2 },

  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
    height: 52,
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, fontWeight: "700", color: colors.bg },

  legal: {
    ...typography.caption,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },

  restoreButton: { alignItems: "center", paddingVertical: spacing.sm },
  restoreText: { ...typography.bodySmall, color: colors.textMuted },
});
