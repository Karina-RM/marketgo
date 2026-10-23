export type StoreCategory =
  'Mercado' | 'Padaria' | 'Farmácia' | 'Restaurante' | 'Hortifrúti';

export interface Store {
  id: string;
  name: string;
  category: StoreCategory;
  emoji: string;
  description: string;
  rating: number;
  delivery_fee: number;
  eta_min: number;
  eta_max: number;
  min_order: number;
  is_open: boolean;
}

export interface Product {
  id: string;
  store_id: string;
  section: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  is_active: boolean;
}

export type PaymentMethod = 'pix' | 'card' | 'cash';

export type OrderStatus =
  'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  emoji: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: string;
  store_id: string;
  store_name: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  change_for: number | null;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_complement: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

// ---- carrinho (guardado no aparelho) ----
export interface CartItem {
  productId: string;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
}

export interface Cart {
  storeId: string | null;
  storeName: string;
  deliveryFee: number;
  minOrder: number;
  items: CartItem[];
}

// O que o app envia ao criar um pedido. Repare: NÃO há preços aqui.
export interface CreateOrderInput {
  storeId: string;
  items: { product_id: string; quantity: number }[];
  payment: PaymentMethod;
  changeFor: number | null;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
}
