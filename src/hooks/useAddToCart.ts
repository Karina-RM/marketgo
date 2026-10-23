import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useCart } from '@/context/CartContext';
import type { Product, Store } from '@/types';

type CartStore = Pick<Store, 'id' | 'name' | 'delivery_fee' | 'min_order' | 'is_open'>;
type CartProduct = Pick<Product, 'id' | 'name' | 'emoji' | 'price'>;

// Adiciona ao carrinho tratando os dois casos especiais: loja fechada e troca de loja.
export function useAddToCart() {
  const { cart, add, replaceWith } = useCart();

  return useCallback(
    (store: CartStore, product: CartProduct, quantity = 1, onAdded?: () => void) => {
      if (!store.is_open) {
        Alert.alert('Loja fechada', 'Esta loja não está aceitando pedidos agora.');
        return;
      }
      if (add(store, product, quantity) === 'added') {
        onAdded?.();
        return;
      }
      Alert.alert(
        'Trocar de loja?',
        `Seu carrinho tem itens de ${cart.storeName}. ` +
          `Deseja esvaziá-lo e começar um pedido em ${store.name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Esvaziar e adicionar',
            style: 'destructive',
            onPress: () => {
              replaceWith(store, product, quantity);
              onAdded?.();
            },
          },
        ],
      );
    },
    [add, replaceWith, cart.storeName],
  );
}
