import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { ORDER_STATUS_LABEL } from '@/constants/catalog';
import { colors, spacing } from '@/theme';
import type { OrderStatus } from '@/types';
import { timeline } from '@/utils/orders';

// Linha do tempo vertical: concluída (verde), atual (laranja) e pendente (cinza).
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const steps = timeline(status);
  return (
    <View>
      {steps.map((step, index) => {
        const done = step.state === 'done';
        const current = step.state === 'current';
        const color = done ? colors.income : current ? colors.primary : colors.border;
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: color }]}>
                {done ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.line, done && { backgroundColor: colors.income }]} />
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                current && styles.current,
                step.state === 'pending' && styles.pending,
              ]}
            >
              {ORDER_STATUS_LABEL[step.status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, minHeight: 48 },
  rail: { alignItems: 'center', width: 24 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 3, backgroundColor: colors.border, marginVertical: 2 },
  label: { fontSize: 16, color: colors.text, paddingTop: 1 },
  current: { fontWeight: '800', color: colors.primary },
  pending: { color: colors.muted },
});
