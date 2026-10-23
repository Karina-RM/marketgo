import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CategoryChips } from '@/components/CategoryChips';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingView } from '@/components/StateViews';
import { StoreCard } from '@/components/StoreCard';
import { useAuth } from '@/context/AuthContext';
import { useStores } from '@/hooks/useCatalog';
import { colors, radius, spacing } from '@/theme';
import type { StoreCategory } from '@/types';
import { filterStores, sortStores } from '@/utils/catalog';
import { friendlyError } from '@/utils/errors';

export default function StoresScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useStores();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StoreCategory | null>(null);

  const stores = useMemo(
    () => sortStores(filterStores(data ?? [], query, category)),
    [data, query, category],
  );
  const firstName = String(user?.user_metadata?.full_name ?? '').split(' ')[0];

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  // O cabeçalho é um elemento (não um componente): o campo de busca não perde o foco.
  const header = (
    <View style={styles.header}>
      <Text style={styles.greeting}>Olá{firstName ? `, ${firstName}` : ''} 👋</Text>
      <Text style={styles.title}>O que vai pedir hoje?</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar loja ou tipo de comida"
        placeholderTextColor={colors.muted}
        style={styles.search}
        clearButtonMode="while-editing"
      />
      <CategoryChips value={category} onChange={setCategory} />
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Nenhuma loja encontrada"
            message="Tente outra busca ou outra categoria."
          />
        }
        renderItem={({ item }) => (
          <StoreCard store={item} onPress={() => router.push(`/store/${item.id}`)} />
        )}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, flexGrow: 1 },
  header: { marginBottom: spacing.sm },
  greeting: { fontSize: 15, color: colors.muted },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
});
