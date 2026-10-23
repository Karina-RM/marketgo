import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingView } from '@/components/StateViews';
import { StatusPill } from '@/components/StatusPill';
import { useOrders } from '@/hooks/useOrders';
import { colors, radius, spacing } from '@/theme';
import { formatDateTime } from '@/utils/date';
import { friendlyError } from '@/utils/errors';
import { formatMoney } from '@/utils/money';

export default function OrdersScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useOrders();

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.title}>Meus pedidos</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon="receipt-outline"
              title="Nenhum pedido ainda"
              message="Seus pedidos aparecem aqui."
            />
            <Button title="Ver lojas" onPress={() => router.push('/')} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/order/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.info}>
              <Text style={styles.store}>{item.store_name}</Text>
              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={styles.total}>{formatMoney(item.total)}</Text>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, flexGrow: 1 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: { flex: 1, justifyContent: 'center', gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  info: { flex: 1, gap: 4 },
  store: { fontSize: 16, fontWeight: '700', color: colors.text },
  date: { fontSize: 13, color: colors.muted },
  total: { fontSize: 16, fontWeight: '800', color: colors.text },
});
