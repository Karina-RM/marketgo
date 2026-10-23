import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { CartBar } from '@/components/CartBar';
import { ProductRow } from '@/components/ProductRow';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { useCart } from '@/context/CartContext';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useProducts, useStore } from '@/hooks/useCatalog';
import { colors, radius, spacing } from '@/theme';
import { formatEta, groupProducts } from '@/utils/catalog';
import { quantityOf } from '@/utils/cart';
import { friendlyError } from '@/utils/errors';
import { formatMoney } from '@/utils/money';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useStore(id);
  const products = useProducts(id);
  const { cart } = useCart();
  const addToCart = useAddToCart();

  const sections = useMemo(() => groupProducts(products.data ?? []), [products.data]);

  if (store.isLoading || products.isLoading) return <LoadingView />;

  if (store.isError || products.isError || !store.data) {
    return (
      <ErrorState
        message={friendlyError(store.error ?? products.error)}
        onRetry={() => {
          store.refetch();
          products.refetch();
        }}
      />
    );
  }

  const s = store.data;
  const header = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.logo}>
          <Text style={styles.logoEmoji}>{s.emoji}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{s.name}</Text>
          <Text style={styles.meta}>
            {s.category} · ⭐ {s.rating.toFixed(1).replace('.', ',')}
          </Text>
        </View>
      </View>
      <Text style={styles.description}>{s.description}</Text>
      {s.is_open ? (
        <Text style={styles.facts}>
          {formatEta(s.eta_min, s.eta_max)} · Entrega{' '}
          {s.delivery_fee === 0 ? 'grátis' : formatMoney(s.delivery_fee)} · Pedido mínimo{' '}
          {formatMoney(s.min_order)}
        </Text>
      ) : (
        <View style={styles.closed}>
          <Text style={styles.closedText}>
            Fechada agora. Você pode ver o cardápio, mas não pedir.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: s.name }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <Text style={styles.section}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            quantityInCart={cart.storeId === s.id ? quantityOf(cart, item.id) : 0}
            disabled={!s.is_open}
            onPress={() => router.push(`/product/${item.id}`)}
            onQuickAdd={() => addToCart(s, item)}
          />
        )}
        stickySectionHeadersEnabled={false}
      />
      <CartBar />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: 100 },
  header: { marginBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 32 },
  headerInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: 2 },
  description: { fontSize: 15, color: colors.text, marginTop: spacing.md },
  facts: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  closed: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  closedText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
