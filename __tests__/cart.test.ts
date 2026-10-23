import type { Order, Product, Store } from '@/types';
import {
  EMPTY_CART,
  MAX_QUANTITY,
  addToCart,
  cartTotals,
  isValidCart,
  itemCount,
  missingForMinimum,
  quantityOf,
  removeItem,
  reorderCart,
  replaceCart,
  setQuantity,
} from '@/utils/cart';

const mercado = { id: 's1', name: 'Mercado', delivery_fee: 5.9, min_order: 20 };
const padaria = { id: 's2', name: 'Padaria', delivery_fee: 3.5, min_order: 10 };

const leite = { id: 'p1', name: 'Leite', emoji: '🥛', price: 5.25 };
const arroz = { id: 'p2', name: 'Arroz', emoji: '🍚', price: 29.9 };
const pao = { id: 'p3', name: 'Pão', emoji: '🥖', price: 4.8 };

describe('addToCart', () => {
  it('cria o carrinho da loja e soma a quantidade do mesmo produto', () => {
    let { cart } = addToCart(EMPTY_CART, mercado, leite, 2);
    ({ cart } = addToCart(cart, mercado, leite, 3));
    expect(cart.storeId).toBe('s1');
    expect(cart.items).toHaveLength(1);
    expect(quantityOf(cart, 'p1')).toBe(5);
  });

  it('avisa o conflito ao misturar lojas e não altera o carrinho', () => {
    const { cart } = addToCart(EMPTY_CART, mercado, leite);
    const result = addToCart(cart, padaria, pao);
    expect(result.conflict).toBe(true);
    expect(result.cart).toBe(cart);
  });

  it('não permite passar do limite de 20 por produto', () => {
    const { cart } = addToCart(EMPTY_CART, mercado, leite, 18);
    expect(quantityOf(addToCart(cart, mercado, leite, 10).cart, 'p1')).toBe(MAX_QUANTITY);
  });

  it('replaceCart descarta o carrinho anterior', () => {
    const cart = replaceCart(padaria, pao, 2);
    expect(cart.storeId).toBe('s2');
    expect(itemCount(cart)).toBe(2);
  });
});

describe('setQuantity e removeItem', () => {
  it('altera a quantidade, limita em 20 e remove com zero', () => {
    let { cart } = addToCart(EMPTY_CART, mercado, leite, 2);
    ({ cart } = addToCart(cart, mercado, arroz, 1));
    expect(quantityOf(setQuantity(cart, 'p1', 7), 'p1')).toBe(7);
    expect(quantityOf(setQuantity(cart, 'p1', 99), 'p1')).toBe(20);
    expect(setQuantity(cart, 'p1', 0).items.map((i) => i.productId)).toEqual(['p2']);
  });

  it('volta ao carrinho vazio quando o último item sai', () => {
    const { cart } = addToCart(EMPTY_CART, mercado, leite);
    expect(removeItem(cart, 'p1')).toBe(EMPTY_CART);
  });
});

describe('cartTotals e pedido mínimo', () => {
  it('soma em centavos e inclui a taxa de entrega', () => {
    let { cart } = addToCart(EMPTY_CART, mercado, leite, 2); // 10,50
    ({ cart } = addToCart(cart, mercado, arroz, 1)); // 29,90
    expect(cartTotals(cart)).toEqual({ subtotal: 40.4, deliveryFee: 5.9, total: 46.3 });
  });

  it('não cobra entrega de carrinho vazio', () => {
    expect(cartTotals(EMPTY_CART)).toEqual({ subtotal: 0, deliveryFee: 0, total: 0 });
  });

  it('evita o erro clássico 0,1 + 0,2', () => {
    const { cart } = addToCart(
      EMPTY_CART,
      { ...mercado, delivery_fee: 0 },
      { ...leite, price: 0.1 },
      1,
    );
    const both = addToCart(
      cart,
      { ...mercado, delivery_fee: 0 },
      { id: 'x', name: 'X', emoji: '🍬', price: 0.2 },
      1,
    ).cart;
    expect(cartTotals(both).subtotal).toBe(0.3);
  });

  it('diz quanto falta para o pedido mínimo', () => {
    const { cart } = addToCart(EMPTY_CART, mercado, leite, 2); // 10,50 de 20,00
    expect(missingForMinimum(cart)).toBe(9.5);
    expect(missingForMinimum(addToCart(cart, mercado, arroz).cart)).toBeNull();
  });
});

describe('isValidCart', () => {
  it('aceita um carrinho válido e recusa formatos quebrados', () => {
    const { cart } = addToCart(EMPTY_CART, mercado, leite);
    expect(isValidCart(cart)).toBe(true);
    expect(isValidCart(EMPTY_CART)).toBe(true);
    expect(isValidCart(null)).toBe(false);
    expect(isValidCart({ ...cart, items: [{ productId: 'p1' }] })).toBe(false);
    expect(isValidCart({ ...cart, deliveryFee: '5' })).toBe(false);
    expect(isValidCart({ ...cart, items: [{ ...cart.items[0], quantity: 0 }] })).toBe(
      false,
    );
  });
});

describe('reorderCart', () => {
  const store = mercado as Store;
  const order = {
    items: [
      { product_id: 'p1', name: 'Leite', quantity: 2 },
      { product_id: 'p2', name: 'Arroz', quantity: 1 },
      { product_id: null, name: 'Produto antigo', quantity: 1 },
    ],
  } as Order;
  const products = [
    { ...leite, price: 5.9, is_active: true },
    { ...arroz, is_active: false },
  ] as Product[];

  it('usa o preço atual e ignora produtos indisponíveis', () => {
    const { cart, skipped } = reorderCart(order, store, products);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ productId: 'p1', price: 5.9, quantity: 2 });
    expect(skipped).toEqual(['Arroz', 'Produto antigo']);
  });

  it('devolve carrinho vazio se nada está disponível', () => {
    expect(reorderCart(order, store, []).cart).toBe(EMPTY_CART);
  });
});
