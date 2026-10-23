import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Cart, Product, Store } from '@/types';
import {
  EMPTY_CART,
  addToCart,
  cartTotals,
  isValidCart,
  itemCount,
  removeItem,
  replaceCart,
  setQuantity,
} from '@/utils/cart';
import { useAuth } from './AuthContext';

type CartStore = Pick<Store, 'id' | 'name' | 'delivery_fee' | 'min_order'>;
type CartProduct = Pick<Product, 'id' | 'name' | 'emoji' | 'price'>;

interface CartContextValue {
  cart: Cart;
  count: number;
  totals: ReturnType<typeof cartTotals>;
  add: (
    store: CartStore,
    product: CartProduct,
    quantity?: number,
  ) => 'added' | 'conflict';
  replaceWith: (store: CartStore, product: CartProduct, quantity?: number) => void;
  setCart: (cart: Cart) => void;
  changeQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// Um carrinho por usuário, guardado no aparelho: sobrevive ao fechar o app.
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [cart, setCartState] = useState<Cart>(EMPTY_CART);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = userId ? `marketgo.cart.${userId}` : null;

  // Carrega o carrinho do usuário logado (e descarta dados com formato inesperado).
  useEffect(() => {
    let cancelled = false;
    setLoadedFor(null);
    setCartState(EMPTY_CART);
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (!cancelled && isValidCart(parsed)) setCartState(parsed);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadedFor(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Salva a cada mudança, mas só depois de carregar (para não apagar o que estava salvo).
  useEffect(() => {
    if (key && loadedFor === key)
      AsyncStorage.setItem(key, JSON.stringify(cart)).catch(() => undefined);
  }, [cart, key, loadedFor]);

  const add = useCallback(
    (store: CartStore, product: CartProduct, quantity = 1) => {
      const result = addToCart(cart, store, product, quantity);
      if (result.conflict) return 'conflict' as const;
      setCartState(result.cart);
      return 'added' as const;
    },
    [cart],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: itemCount(cart),
      totals: cartTotals(cart),
      add,
      replaceWith: (store, product, quantity = 1) =>
        setCartState(replaceCart(store, product, quantity)),
      setCart: setCartState,
      changeQuantity: (productId, quantity) =>
        setCartState((c) => setQuantity(c, productId, quantity)),
      remove: (productId) => setCartState((c) => removeItem(c, productId)),
      clear: () => setCartState(EMPTY_CART),
    }),
    [cart, add],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de <CartProvider>');
  return context;
}
