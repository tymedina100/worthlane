import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: Object.fromEntries(['react-native', 'expo-notifications', '@react-native-async-storage/async-storage'].map(name => [name, path.resolve(__dirname, '../mobile/node_modules', name)])) },
  test: { environment: 'node', include: ['integration/mobile-reminders.native.ts'], fileParallelism: false },
});
