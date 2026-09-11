import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: Object.fromEntries(['react-native', 'expo-notifications', '@react-native-async-storage/async-storage'].map(name => [name, path.resolve(__dirname, '../mobile/node_modules', name)])) },
  test: { environment: 'node', include: ['integration/mobile-reminders.native.ts', 'integration/mobile-plaid.native.ts', 'integration/mobile-plaid-exit.native.ts', 'integration/mobile-dates.native.ts'], fileParallelism: false },
});
