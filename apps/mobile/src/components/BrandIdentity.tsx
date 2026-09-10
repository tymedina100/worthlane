import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

export function BrandIdentity() {
  const { colors } = useTheme();
  return <View accessible accessibilityLabel="Worthlane" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <Svg accessible={false} width={42} height={42} viewBox="0 0 48 48"><Path d="M6 13l9 23 9-17 9 17 9-23M18 9h12" fill="none" stroke={colors.primary} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>
    <Text style={{ fontSize: 31, fontWeight: '600', letterSpacing: -1.1, color: colors.text }}>worthlane</Text>
  </View>;
}
