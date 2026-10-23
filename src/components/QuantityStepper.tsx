import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';
import { MAX_QUANTITY } from '@/utils/cart';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = MAX_QUANTITY,
}: QuantityStepperProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Diminuir quantidade"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.button, value <= min && styles.disabled]}
      >
        <Ionicons
          name={value === 1 && min === 0 ? 'trash-outline' : 'remove'}
          size={20}
          color={colors.primary}
        />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar quantidade"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.button, value >= max && styles.disabled]}
      >
        <Ionicons name="add" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  value: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
