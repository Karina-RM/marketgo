import { useQuery } from '@tanstack/react-query';
import { getProduct, getStore, listProducts, listStores } from '@/services/stores';

export const useStores = () =>
  useQuery({ queryKey: ['stores'], queryFn: listStores, staleTime: 60_000 });

export function useStore(id: string | undefined) {
  return useQuery({
    queryKey: ['stores', id],
    queryFn: () => getStore(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'store', storeId],
    queryFn: () => listProducts(storeId as string),
    enabled: Boolean(storeId),
    staleTime: 60_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
