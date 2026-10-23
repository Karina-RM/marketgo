import { StyleSheet, Text, View } from 'react-native';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '@/constants/catalog';
import { radius } from '@/theme';
import type { OrderStatus } from '@/types';

export function StatusPill({ status }: { status: OrderStatus }) {
  const { fg, bg } = ORDER_STATUS_COLOR[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{ORDER_STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: 12, fontWeight: '700' },
});
