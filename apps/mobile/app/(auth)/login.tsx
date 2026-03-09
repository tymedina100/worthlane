import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "@/store/auth";
import { colors, spacing, radius, typography } from "@/lib/theme";

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "Face ID";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
  return "Biometrics";
}

export default function LoginScreen() {
  const { login, loginWithBiometric, enableBiometric, biometricEnabled, rememberedEmail, setRememberedEmail } = useAuthStore();

  const [email, setEmail] = useState(rememberedEmail ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(!!rememberedEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricHardwareAvailable, setBiometricHardwareAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");

  const checkBiometrics = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricLabel(getBiometricLabel(types));
      setBiometricHardwareAvailable(true);
      if (biometricEnabled) {
        setBiometricAvailable(true);
        return true;
      }
    }
    return false;
  }, [biometricEnabled]);

  const handleBiometricLogin = useCallback(async () => {
    setLoading(true);
    try {
      await loginWithBiometric();
      router.replace("/(tabs)/dashboard");
    } catch (e: unknown) {
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loginWithBiometric]);

  // Auto-prompt biometric on mount if enabled.
  useEffect(() => {
    checkBiometrics().then((available) => {
      if (available) {
        handleBiometricLogin().catch(() => {
          // Swallow — user will use password or tap the biometric button.
        });
      }
    });
  }, [checkBiometrics, handleBiometricLogin]);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      await setRememberedEmail(rememberMe ? email.trim().toLowerCase() : null);
      router.replace("/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricTap = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithBiometric();
      router.replace("/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Please sign in with your password.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Enable ${biometricLabel} for Finance`,
      fallbackLabel: "Cancel",
      disableDeviceFallback: true,
    });
    if (!result.success) return;
    await enableBiometric();
    setBiometricAvailable(true);
    await handleBiometricTap();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>Finance</Text>
        <Text style={styles.tagline}>Your money, finally making sense.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textDim}
          value={email}
          onChangeText={(v) => { setEmail(v); setError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textDim}
          value={password}
          onChangeText={(v) => { setPassword(v); setError(null); }}
          secureTextEntry
          autoComplete="current-password"
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRememberMe((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {biometricAvailable && (
          <TouchableOpacity
            style={[styles.biometricButton, loading && styles.buttonDisabled]}
            onPress={handleBiometricTap}
            disabled={loading}
          >
            <Text style={styles.biometricButtonText}>Sign in with {biometricLabel}</Text>
          </TouchableOpacity>
        )}

        {biometricHardwareAvailable && !biometricEnabled && (
          <TouchableOpacity
            style={[styles.biometricButton, loading && styles.buttonDisabled]}
            onPress={handleEnableBiometric}
            disabled={loading}
          >
            <Text style={styles.biometricButtonText}>Enable {biometricLabel}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={{ color: colors.primary }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  logo: {
    ...typography.numberLarge,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
  },
  biometricButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  biometricButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
