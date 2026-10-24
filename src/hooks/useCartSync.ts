import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { getStore, listProducts } from '@/services/stores';
import { refreshCart } from '@/utils/cart';
import { formatMoney } from '@/utils/money';

// Ao abrir o carrinho ou o checkout, busca os dados atuais da loja e dos produtos e
// atualiza o carrinho salvo no aparelho. Assim, o total mostrado bate com o que o banco
// vai cobrar. Devolve um aviso para a tela quando algo mudou.
export function useCartSync() {
  const { cart, setCart } = useCart();
  const storeId = cart.storeId ?? undefined;
  const [notice, setNotice] = useState<string | null>(null);

  const store = useQuery({
    queryKey: ['cart-sync', 'store', storeId],
    queryFn: () => getStore(storeId as string),
    enabled: Boolean(storeId),
    staleTime: 0,
  });
  const products = useQuery({
    queryKey: ['cart-sync', 'products', storeId],
    queryFn: () => listProducts(storeId as string),
    enabled: Boolean(storeId),
    staleTime: 0,
  });

  useEffect(() => {
    if (!store.data || !products.data || cart.items.length === 0) return;
    if (store.data.id !== cart.storeId) return;
    const r = refreshCart(cart, store.data, products.data);
    if (r.cart === cart) return;
    const parts: string[] = [];
    for (const c of r.priceChanges)
      parts.push(`${c.name}: de ${formatMoney(c.from)} para ${formatMoney(c.to)}`);
    if (r.removed.length > 0) parts.push(`indisponível agora: ${r.removed.join(', ')}`);
    if (r.storeChanged) parts.push('taxa de entrega ou pedido mínimo da loja');
    setNotice(
      `Atualizamos seu carrinho com os dados atuais da loja (${parts.join('; ')}).`,
    );
    setCart(r.cart);
  }, [store.data, products.data, cart, setCart]);

  return notice;
}
