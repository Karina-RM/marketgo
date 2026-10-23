import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';
import type { Store } from '@/types';
import { formatEta } from '@/utils/catalog';
import { formatMoney } from '@/utils/money';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
}

export function StoreCard({ store, onPress }: StoreCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        !store.is_open && styles.closed,
      ]}
    >
      <View style={styles.logo}>
        <Text style={styles.emoji}>{store.emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={styles.meta}>
          {store.category} · ⭐ {store.rating.toFixed(1).replace('.', ',')}
        </Text>
        {store.is_open ? (
          <Text style={styles.meta}>
            {formatEta(store.eta_min, store.eta_max)} ·{' '}
            {store.delivery_fee === 0
              ? 'Entrega grátis'
              : formatMoney(store.delivery_fee)}
          </Text>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Fechada agora</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  closed: { opacity: 0.6 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 32 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.danger },
});
