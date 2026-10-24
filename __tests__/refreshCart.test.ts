import type { Cart } from '@/types';
import { refreshCart } from '@/utils/cart';

// Limitação encontrada na Etapa 13: o carrinho guardava o preço do momento em que o item
// entrou. refreshCart atualiza o carrinho com os dados atuais do banco.
const store = { id: 's1', name: 'Hortifrúti da Terra', delivery_fee: 4.9, min_order: 25 };
const uva = {
  id: 'p1',
  name: 'Uva sem semente 500 g',
  emoji: '🍇',
  price: 14.9,
  is_active: true,
};
const ovos = {
  id: 'p2',
  name: 'Ovos caipiras (12 un)',
  emoji: '🥚',
  price: 16,
  is_active: true,
};

const cart: Cart = {
  storeId: 's1',
  storeName: 'Hortifrúti da Terra',
  deliveryFee: 4.9,
  minOrder: 25,
  items: [
    { productId: 'p1', name: uva.name, emoji: uva.emoji, price: 15.9, quantity: 1 },
    { productId: 'p2', name: ovos.name, emoji: ovos.emoji, price: 16, quantity: 2 },
  ],
};

describe('refreshCart', () => {
  it('atualiza o preço que mudou no banco e informa a mudança', () => {
    const r = refreshCart(cart, store, [uva, ovos]);
    expect(r.cart.items.map((i) => i.price)).toEqual([14.9, 16]);
    expect(r.cart.items[1].quantity).toBe(2);
    expect(r.priceChanges).toEqual([{ name: uva.name, from: 15.9, to: 14.9 }]);
    expect(r.removed).toEqual([]);
  });

  it('devolve o mesmo carrinho quando nada mudou', () => {
    const atual = refreshCart(cart, store, [uva, ovos]).cart;
    expect(refreshCart(atual, store, [uva, ovos]).cart).toBe(atual);
  });

  it('remove itens inativos ou que sumiram, e esvazia se não sobrar nada', () => {
    const r = refreshCart(cart, store, [{ ...uva, is_active: false }, ovos]);
    expect(r.cart.items.map((i) => i.productId)).toEqual(['p2']);
    expect(r.removed).toEqual([uva.name]);
    expect(refreshCart(cart, store, []).cart.items).toEqual([]);
  });

  it('atualiza a taxa de entrega e o pedido mínimo da loja', () => {
    const r = refreshCart(cart, { ...store, delivery_fee: 6, min_order: 30 }, [
      { ...uva, price: 15.9 },
      ovos,
    ]);
    expect(r.storeChanged).toBe(true);
    expect(r.cart.deliveryFee).toBe(6);
    expect(r.cart.minOrder).toBe(30);
  });
});
