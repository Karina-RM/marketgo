import type { OrderStatus, PaymentMethod, StoreCategory } from '@/types';

export const STORE_CATEGORIES: { name: StoreCategory; emoji: string }[] = [
  { name: 'Mercado', emoji: '🛒' },
  { name: 'Padaria', emoji: '🥖' },
  { name: 'Farmácia', emoji: '💊' },
  { name: 'Hortifrúti', emoji: '🥬' },
  { name: 'Restaurante', emoji: '🍽️' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'pix', label: 'Pix', hint: 'Pagamento simulado' },
  { value: 'card', label: 'Cartão na entrega', hint: 'Levamos a maquininha' },
  { value: 'cash', label: 'Dinheiro', hint: 'Informe o troco, se precisar' },
];

// Ordem em que o pedido avança. "cancelled" fica fora da linha do tempo.
export const ORDER_FLOW: OrderStatus[] = [
  'received',
  'preparing',
  'out_for_delivery',
  'delivered',
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Pedido recebido',
  preparing: 'Em preparo',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, { fg: string; bg: string }> = {
  received: { fg: '#B45309', bg: '#FEF3C7' },
  preparing: { fg: '#1D4ED8', bg: '#DBEAFE' },
  out_for_delivery: { fg: '#7C3AED', bg: '#EDE9FE' },
  delivered: { fg: '#15803D', bg: '#DCFCE7' },
  cancelled: { fg: '#B91C1C', bg: '#FEE2E2' },
};
