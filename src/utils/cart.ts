import type { Cart, CartItem, Order, Product, Store } from '@/types';

export const MAX_QUANTITY = 20;

export const EMPTY_CART: Cart = {
  storeId: null,
  storeName: '',
  deliveryFee: 0,
  minOrder: 0,
  items: [],
};

type CartStore = Pick<Store, 'id' | 'name' | 'delivery_fee' | 'min_order'>;
type CartProduct = Pick<Product, 'id' | 'name' | 'emoji' | 'price'>;

const clamp = (n: number) => Math.max(0, Math.min(MAX_QUANTITY, Math.floor(n)));
const cents = (value: number) => Math.round(value * 100);

function newCart(store: CartStore): Cart {
  return {
    storeId: store.id,
    storeName: store.name,
    deliveryFee: store.delivery_fee,
    minOrder: store.min_order,
    items: [],
  };
}

function withItem(cart: Cart, product: CartProduct, quantity: number): Cart {
  const existing = cart.items.find((i) => i.productId === product.id);
  const total = clamp((existing?.quantity ?? 0) + quantity);
  if (total === 0)
    return { ...cart, items: cart.items.filter((i) => i.productId !== product.id) };
  const item: CartItem = {
    productId: product.id,
    name: product.name,
    emoji: product.emoji,
    price: product.price,
    quantity: total,
  };
  return existing
    ? { ...cart, items: cart.items.map((i) => (i.productId === product.id ? item : i)) }
    : { ...cart, items: [...cart.items, item] };
}

// Regra do delivery: o carrinho é de UMA loja por vez. Se o produto for de outra loja,
// devolvemos "conflict" e a tela pergunta se o usuário quer trocar.
export function addToCart(
  cart: Cart,
  store: CartStore,
  product: CartProduct,
  quantity = 1,
): { cart: Cart; conflict: boolean } {
  if (cart.storeId && cart.storeId !== store.id && cart.items.length > 0) {
    return { cart, conflict: true };
  }
  const base = cart.storeId === store.id ? cart : newCart(store);
  return { cart: withItem(base, product, quantity), conflict: false };
}

// Começa um carrinho novo (descarta o anterior).
export function replaceCart(store: CartStore, product: CartProduct, quantity = 1): Cart {
  return withItem(newCart(store), product, quantity);
}

export function setQuantity(cart: Cart, productId: string, quantity: number): Cart {
  const q = clamp(quantity);
  const items =
    q === 0
      ? cart.items.filter((i) => i.productId !== productId)
      : cart.items.map((i) => (i.productId === productId ? { ...i, quantity: q } : i));
  return items.length === 0 ? EMPTY_CART : { ...cart, items };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return setQuantity(cart, productId, 0);
}

export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function quantityOf(cart: Cart, productId: string): number {
  return cart.items.find((i) => i.productId === productId)?.quantity ?? 0;
}

// Soma em centavos inteiros para não acumular erro de ponto flutuante.
export function cartTotals(cart: Cart): {
  subtotal: number;
  deliveryFee: number;
  total: number;
} {
  const sub = cart.items.reduce((sum, i) => sum + cents(i.price) * i.quantity, 0);
  const fee = cart.items.length > 0 ? cents(cart.deliveryFee) : 0;
  return { subtotal: sub / 100, deliveryFee: fee / 100, total: (sub + fee) / 100 };
}

// Quanto falta para atingir o pedido mínimo da loja (null se já atingiu).
export function missingForMinimum(cart: Cart): number | null {
  const missing = cents(cart.minOrder) - cents(cartTotals(cart).subtotal);
  return missing > 0 ? missing / 100 : null;
}

// O carrinho vem do AsyncStorage: confira o formato antes de confiar nele.
export function isValidCart(value: unknown): value is Cart {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (!(c.storeId === null || typeof c.storeId === 'string')) return false;
  if (
    typeof c.storeName !== 'string' ||
    typeof c.deliveryFee !== 'number' ||
    typeof c.minOrder !== 'number'
  ) {
    return false;
  }
  if (!Array.isArray(c.items)) return false;
  return c.items.every((i) => {
    if (typeof i !== 'object' || i === null) return false;
    const item = i as Record<string, unknown>;
    return (
      typeof item.productId === 'string' &&
      typeof item.name === 'string' &&
      typeof item.emoji === 'string' &&
      typeof item.price === 'number' &&
      typeof item.quantity === 'number' &&
      item.quantity >= 1 &&
      item.quantity <= MAX_QUANTITY
    );
  });
}

// "Pedir novamente": monta o carrinho com os itens de um pedido antigo, usando os
// preços e a disponibilidade ATUAIS. Produtos que saíram do catálogo ficam de fora.
export function reorderCart(
  order: Pick<Order, 'items'>,
  store: CartStore,
  products: Pick<Product, 'id' | 'name' | 'emoji' | 'price' | 'is_active'>[],
): { cart: Cart; skipped: string[] } {
  let cart = newCart(store);
  const skipped: string[] = [];
  for (const item of order.items ?? []) {
    const product = products.find((p) => p.id === item.product_id && p.is_active);
    if (!product) skipped.push(item.name);
    else cart = withItem(cart, product, item.quantity);
  }
  return { cart: cart.items.length > 0 ? cart : EMPTY_CART, skipped };
}
