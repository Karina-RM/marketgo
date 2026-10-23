import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

const STAR_COLOR = '#F59E0B';
const EMPTY_COLOR = '#CBD5E1';

interface StarRatingProps {
  value: number;
  onChange?: (stars: number) => void; // sem onChange, as estrelas só exibem a nota
  size?: number;
}

export function StarRating({ value, onChange, size = 36 }: StarRatingProps) {
  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${value} de 5 estrelas`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons
            key={n}
            name={n <= value ? 'star' : 'star-outline'}
            size={size}
            color={n <= value ? STAR_COLOR : EMPTY_COLOR}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          hitSlop={6}
          accessibilityRole="radio"
          accessibilityState={{ selected: n === value }}
          accessibilityLabel={n === 1 ? '1 estrela' : `${n} estrelas`}
        >
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={size}
            color={n <= value ? STAR_COLOR : EMPTY_COLOR}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
});
