import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/lib/theme";

export default function Index() {
  const { userId, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={userId ? "/(tabs)/dashboard" : "/(auth)/login"} />;
}
