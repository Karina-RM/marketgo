import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { StarRating } from '@/components/StarRating';
import { useOrderRating, useRateOrder } from '@/hooks/useRating';
import { MAX_RATING_COMMENT, ratingSchema } from '@/schemas/rating';
import { colors, spacing } from '@/theme';
import { friendlyError } from '@/utils/errors';

// Extra: avaliação do pedido. Só aparece para pedidos entregues.
export function RatingCard({ orderId }: { orderId: string }) {
  const { data: rating, isLoading } = useOrderRating(orderId, true);
  const rate = useRateOrder();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return null;

  if (rating) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Sua avaliação</Text>
        <StarRating value={rating.stars} size={28} />
        {rating.comment ? <Text style={styles.comment}>“{rating.comment}”</Text> : null}
      </Card>
    );
  }

  function submit() {
    const parsed = ratingSchema.safeParse({ stars, comment });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Avaliação inválida');
      return;
    }
    setError(null);
    rate.mutate(
      { orderId, ...parsed.data },
      { onError: (e) => setError(friendlyError(e)) },
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Avalie seu pedido</Text>
      <Text style={styles.hint}>Como foi a sua experiência com esta loja?</Text>
      <View style={styles.stars}>
        <StarRating value={stars} onChange={setStars} />
      </View>
      <Input
        label="Comentário (opcional)"
        placeholder="Conte o que achou"
        value={comment}
        onChangeText={setComment}
        maxLength={MAX_RATING_COMMENT}
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Enviar avaliação"
        onPress={submit}
        loading={rate.isPending}
        disabled={stars === 0}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  hint: { fontSize: 14, color: colors.muted, marginBottom: spacing.sm },
  stars: { marginBottom: spacing.md },
  comment: { fontSize: 15, color: colors.text, marginTop: spacing.sm },
  error: { fontSize: 13, color: colors.danger, marginBottom: spacing.sm },
});
