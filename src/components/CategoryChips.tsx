import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { STORE_CATEGORIES } from '@/constants/catalog';
import { colors, radius, spacing } from '@/theme';
import type { StoreCategory } from '@/types';

interface CategoryChipsProps {
  value: StoreCategory | null;
  onChange: (next: StoreCategory | null) => void;
}

// Toque em uma categoria para filtrar; toque de novo para limpar.
export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {STORE_CATEGORIES.map((c) => {
        const selected = c.name === value;
        return (
          <Pressable
            key={c.name}
            onPress={() => onChange(selected ? null : c.name)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>{c.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  emoji: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelSelected: { color: '#FFFFFF' },
});
