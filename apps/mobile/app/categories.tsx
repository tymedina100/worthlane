import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { Category } from "@finance/types";

const PRESET_COLORS = [
  "#34D399", "#22C55E", "#3B82F6", "#8B5CF6",
  "#F59E0B", "#EF4444", "#EC4899", "#F97316",
  "#06B6D4", "#14B8A6", "#94A3B8", "#FBBF24",
];

const PRESET_ICONS = [
  "🏷️", "🛒", "🍔", "🚗", "🏠", "💻", "📚", "💪",
  "✈️", "🎯", "💊", "👔", "🎮", "🐕", "🌱", "☕",
  "🎵", "🛠️", "📱", "🎁",
];

interface CategoryModalProps {
  visible: boolean;
  initial?: Category;
  onClose: () => void;
}

function CategoryModal({ visible, initial, onClose }: CategoryModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? PRESET_ICONS[0]);
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const queryClient = useQueryClient();

  const isEdit = !!initial;

  const mutation = useMutation({
    mutationFn: (data: { name: string; icon: string; color: string }) =>
      isEdit
        ? api.patch(`/categories/${initial!.id}`, data)
        : api.post("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onClose();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save category.");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return Alert.alert("Name required", "Please enter a category name.");
    mutation.mutate({ name: name.trim(), icon, color });
  };

  const handleClose = () => {
    setName(initial?.name ?? "");
    setIcon(initial?.icon ?? PRESET_ICONS[0]);
    setColor(initial?.color ?? PRESET_COLORS[0]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEdit ? "Edit Category" : "New Category"}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={mutation.isPending}>
              <Text style={[styles.modalSave, mutation.isPending && { opacity: 0.5 }]}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
            {/* Preview */}
            <View style={styles.previewRow}>
              <View style={[styles.previewChip, { backgroundColor: color + "33", borderColor: color }]}>
                <Text style={styles.previewIcon}>{icon}</Text>
                <Text style={[styles.previewName, { color }]}>{name || "Category Name"}</Text>
              </View>
            </View>

            {/* Name input */}
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Gym, Pet Care"
              placeholderTextColor={colors.textDim}
              maxLength={50}
              autoFocus={!isEdit}
            />

            {/* Icon picker */}
            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {PRESET_ICONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.iconCell, icon === emoji && { backgroundColor: color + "33", borderColor: color }]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={styles.iconEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color picker */}
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CategoriesScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: unknown) => {
      Alert.alert("Cannot Delete", e instanceof Error ? e.message : "Could not delete category.");
    },
  });

  const handleDelete = (cat: Category) => {
    Alert.alert(
      "Delete Category",
      `Delete "${cat.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(cat.id) },
      ]
    );
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditing(undefined);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditing(undefined);
  };

  const systemCats = categories?.filter((c) => c.isSystem) ?? [];
  const userCats = categories?.filter((c) => !c.isSystem) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity onPress={handleAdd}>
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {isLoading && <Text style={styles.emptyText}>Loading…</Text>}

        {/* Custom categories */}
        {userCats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Custom</Text>
            {userCats.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={[styles.iconBadge, { backgroundColor: cat.color + "33" }]}>
                  <Text style={styles.rowIcon}>{cat.icon}</Text>
                </View>
                <Text style={styles.rowName}>{cat.name}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity onPress={() => handleEdit(cat)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(cat)}
                    disabled={deleteMutation.isPending}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!isLoading && userCats.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Custom</Text>
            <Text style={styles.emptyText}>
              No custom categories yet. Tap "+ Add" to create one.
            </Text>
          </View>
        )}

        {/* System categories */}
        {systemCats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>System</Text>
            {systemCats.map((cat) => (
              <View key={cat.id} style={[styles.categoryRow, styles.systemRow]}>
                <View style={[styles.iconBadge, { backgroundColor: cat.color + "33" }]}>
                  <Text style={styles.rowIcon}>{cat.icon}</Text>
                </View>
                <Text style={styles.rowName}>{cat.name}</Text>
                <Text style={styles.systemBadge}>System</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CategoryModal
        visible={modalVisible}
        initial={editing}
        onClose={handleModalClose}
      />
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
  },
  backButton: { ...typography.label, color: colors.primary },
  title: { ...typography.h3 },
  addButton: { ...typography.label, color: colors.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  systemRow: { opacity: 0.7 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  rowIcon: { fontSize: 18 },
  rowName: { ...typography.label, flex: 1 },
  rowActions: { flexDirection: "row", gap: spacing.sm },
  editBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: colors.danger },
  systemBadge: { fontSize: 11, color: colors.textDim },
  emptyText: { ...typography.bodySmall, marginBottom: spacing.sm },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.label },
  modalCancel: { ...typography.body, color: colors.textMuted },
  modalSave: { ...typography.label, color: colors.primary },
  modalContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  previewRow: { alignItems: "center", marginBottom: spacing.lg },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  previewIcon: { fontSize: 16 },
  previewName: { fontWeight: "600", fontSize: 14 },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconEmoji: { fontSize: 22 },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
});
