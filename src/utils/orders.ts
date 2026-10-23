import { ORDER_FLOW } from '@/constants/catalog';
import type { OrderStatus } from '@/types';

export type StepState = 'done' | 'current' | 'pending';

// Linha do tempo do pedido: cada etapa está concluída, em andamento ou pendente.
export function timeline(
  status: OrderStatus,
): { status: OrderStatus; state: StepState }[] {
  const current = ORDER_FLOW.indexOf(status);
  return ORDER_FLOW.map((s, i) => ({
    status: s,
    state:
      status === 'cancelled'
        ? 'pending'
        : i < current || status === 'delivered'
          ? 'done'
          : i === current
            ? 'current'
            : 'pending',
  }));
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(status);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
}

// Enquanto o pedido está em andamento, a tela consulta o servidor de tempos em tempos.
export const isActive = (status: OrderStatus) =>
  status !== 'delivered' && status !== 'cancelled';

export const canCancel = (status: OrderStatus) => status === 'received';
