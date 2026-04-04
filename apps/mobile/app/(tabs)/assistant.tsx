import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTED_PROMPTS = [
  "How am I doing this month?",
  "Which budget needs attention?",
  "How long until I hit my savings goal?",
  "Where am I overspending?",
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const streamingIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
    const assistantId = (Date.now() + 1).toString();
    streamingIdRef.current = assistantId;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    scrollToBottom();

    // Build conversation history (excluding the streaming placeholder)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      let accumulated = "";
      for await (const token of api.stream("/ai/chat", {
        message: trimmed,
        conversationHistory: history,
      })) {
        accumulated += token;
        const id = streamingIdRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, content: accumulated } : m
          )
        );
        scrollToBottom();
      }
      // Mark done
      const id = streamingIdRef.current;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, streaming: false } : m))
      );
    } catch (e) {
      const errorText = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      const id = streamingIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, content: errorText, streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      streamingIdRef.current = null;
      scrollToBottom();
    }
  }, [isStreaming, messages, scrollToBottom]);

  const isEmpty = messages.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrap}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Worthlane AI</Text>
              <Text style={styles.headerSub}>Your financial assistant</Text>
            </View>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={() => setMessages([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.messageList, isEmpty && styles.messageListEmpty]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
        >
          {isEmpty ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Ask me anything</Text>
              <Text style={styles.emptySubtitle}>
                I have access to your financial snapshot and can help you stay on track.
              </Text>
              <View style={styles.suggestionsGrid}>
                {SUGGESTED_PROMPTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.suggestionChip}
                    onPress={() => sendMessage(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}>
                {m.role === "assistant" && m.streaming && m.content === "" ? (
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.typingText}>Thinking...</Text>
                  </View>
                ) : (
                  <Text style={[styles.bubbleText, m.role === "user" ? styles.userText : styles.aiText]}>
                    {m.content}
                    {m.streaming ? <Text style={{ color: colors.primary }}>▌</Text> : null}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your finances..."
            placeholderTextColor={colors.textDim}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            editable={!isStreaming}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isStreaming) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={!input.trim() || isStreaming ? colors.textDim : colors.bg}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { ...typography.label, fontSize: 15 },
  headerSub: { fontSize: 11, color: colors.textDim, marginTop: 1 },
  clearText: { fontSize: 13, color: colors.textMuted },

  messageList: { padding: spacing.md, gap: spacing.sm },
  messageListEmpty: { flex: 1 },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.h3, marginBottom: spacing.sm, textAlign: "center" },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  suggestionsGrid: { gap: spacing.sm, width: "100%" },
  suggestionChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: { ...typography.bodySmall, color: colors.text, fontSize: 14 },

  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: colors.bg, fontWeight: "500" },
  aiText: { color: colors.text },

  typingIndicator: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  typingText: { ...typography.caption, color: colors.textMuted },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
});
