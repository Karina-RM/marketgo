import { canCancel, isActive, nextStatus, timeline } from '@/utils/orders';

describe('timeline', () => {
  it('marca concluídas, a atual e as pendentes', () => {
    expect(timeline('preparing').map((s) => s.state)).toEqual([
      'done',
      'current',
      'pending',
      'pending',
    ]);
  });

  it('entregue deixa todas as etapas concluídas', () => {
    expect(timeline('delivered').every((s) => s.state === 'done')).toBe(true);
  });

  it('cancelado não avança nenhuma etapa', () => {
    expect(timeline('cancelled').every((s) => s.state === 'pending')).toBe(true);
  });
});

describe('status', () => {
  it('nextStatus segue a ordem e termina em entregue', () => {
    expect(nextStatus('received')).toBe('preparing');
    expect(nextStatus('out_for_delivery')).toBe('delivered');
    expect(nextStatus('delivered')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
  });

  it('só está ativo o que não terminou', () => {
    expect(isActive('preparing')).toBe(true);
    expect(isActive('delivered')).toBe(false);
    expect(isActive('cancelled')).toBe(false);
  });

  it('só cancela um pedido recém-recebido', () => {
    expect(canCancel('received')).toBe(true);
    expect(canCancel('preparing')).toBe(false);
  });
});
