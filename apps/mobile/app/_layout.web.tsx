import { StyleSheet, Text, View } from "react-native";

// The browser app lives in apps/desktop and uses HttpOnly session cookies.
// Do not mount native auth, SecureStore, reminders or billing on the web.
export default function WebEntry() {
  const local = __DEV__ && typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const destination = local ? "http://localhost:3402" : "https://worthlane.app";

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.brand}>Worthlane</Text>
        <Text accessibilityRole="header" style={styles.title}>A shared plan. Space for what’s yours.</Text>
        <Text style={styles.body}>
          This address serves the mobile app. Open Worthlane for the web to plan
          your spending in this browser.
        </Text>
        <a href={destination} style={linkStyle}>
          {local ? "Open Worthlane for the web" : "Visit Worthlane"}
        </a>
        {local && <Text style={styles.note}>
          Testing the iPhone app? Open Worthlane inside the laptop’s Simulator,
          then enter this development server address there.
        </Text>}
      </View>
    </View>
  );
}

const linkStyle = {
  background: "#193B32", color: "#FFFFFF", borderRadius: 14,
  padding: "16px 22px", textDecoration: "none", fontWeight: 600,
  fontFamily: "system-ui, sans-serif", textAlign: "center" as const,
};
const styles = StyleSheet.create({
  page: { flex: 1, minHeight: "100%", backgroundColor: "#FAF8F2", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 520, alignSelf: "center", gap: 24 },
  brand: { color: "#193B32", fontSize: 22, fontWeight: "700" },
  title: { color: "#193B32", fontSize: 36, fontWeight: "600", lineHeight: 43 },
  body: { color: "#46564E", fontSize: 18, lineHeight: 28 },
  note: { color: "#46564E", fontSize: 14, lineHeight: 22 },
});
