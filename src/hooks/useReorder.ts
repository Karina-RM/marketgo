import { useMutation } from '@tanstack/react-query';
import { getStore, listProducts } from '@/services/stores';
import type { Order } from '@/types';
import { reorderCart } from '@/utils/cart';

// "Pedir novamente": busca os preços e a disponibilidade atuais e monta o carrinho.
export function useReorder() {
  return useMutation({
    mutationFn: async (order: Order) => {
      const [store, products] = await Promise.all([
        getStore(order.store_id),
        listProducts(order.store_id),
      ]);
      return reorderCart(order, store, products);
    },
  });
}
