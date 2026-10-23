import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import type { Product } from '@/types';
import { formatMoney } from '@/utils/money';

interface ProductRowProps {
  product: Product;
  quantityInCart: number;
  disabled?: boolean;
  onPress: () => void;
  onQuickAdd: () => void;
}

export function ProductRow({
  product,
  quantityInCart,
  disabled,
  onPress,
  onQuickAdd,
}: ProductRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        <Text style={styles.emoji}>{product.emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {product.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Adicionar ${product.name}`}
        disabled={disabled}
        onPress={onQuickAdd}
        style={[styles.add, disabled && styles.addDisabled]}
      >
        {quantityInCart > 0 ? (
          <Text style={styles.addCount}>{quantityInCart}</Text>
        ) : (
          <Ionicons name="add" size={24} color="#FFFFFF" />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  description: { fontSize: 13, color: colors.muted },
  price: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { backgroundColor: colors.border },
  addCount: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
