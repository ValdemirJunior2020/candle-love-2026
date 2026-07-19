import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius } from '@/constants/theme';
export function FormField({ label, error, multiline, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.wrap}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#74675D" style={[styles.input, multiline && styles.multiline, error && styles.errorBorder]} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} {...props}/>{error && <Text style={styles.error}>{error}</Text>}</View>;
}
const styles = StyleSheet.create({ wrap: { gap: 7 }, label: { color: colors.cream, fontSize: 13, fontWeight: '700' }, input: { minHeight: 50, color: colors.text, backgroundColor: '#100B08', borderColor: colors.borderSoft, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16 }, multiline: { minHeight: 105, paddingTop: 14 }, errorBorder: { borderColor: colors.red }, error: { color: colors.red, fontSize: 12 } });
