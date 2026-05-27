import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
}

// AppShell handles safe-area insets at the shell level, so ScreenHeader
// just provides a page-level title/subtitle section with theme-aware colors.
export function ScreenHeader({ title, subtitle }: Props) {
  const { c } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { color: c.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  title:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sub:    { fontSize: 13, marginTop: 2 },
});
