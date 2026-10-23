import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRating, rateOrder } from '@/services/ratings';

// A chave começa com 'orders' para ser limpa junto com os pedidos (ex.: ao sair da conta).
const ratingKey = (orderId: string | undefined) => ['orders', 'rating', orderId];

export function useOrderRating(orderId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ratingKey(orderId),
    queryFn: () => getRating(orderId as string),
    enabled: Boolean(orderId) && enabled,
  });
}

export function useRateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rateOrder,
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({ queryKey: ratingKey(input.orderId) }),
  });
}
