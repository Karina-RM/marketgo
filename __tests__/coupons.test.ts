import {
  isCouponCodeFormat,
  normalizeCouponCode,
  totalWithDiscount,
} from '@/utils/coupons';

describe('cupons (extra)', () => {
  it('normaliza o código como o banco espera', () => {
    expect(normalizeCouponCode('  bem vindo10 ')).toBe('BEMVINDO10');
    expect(isCouponCodeFormat('BEMVINDO10')).toBe(true);
    expect(isCouponCodeFormat('AB')).toBe(false);
    expect(isCouponCodeFormat('COM-HIFEN')).toBe(false);
  });

  it('desconta em centavos, sem erro de arredondamento', () => {
    expect(totalWithDiscount(54.7, 4.88)).toBe(49.82);
    expect(totalWithDiscount(0.3, 0.1)).toBe(0.2);
  });

  it('o total nunca fica negativo nem aumenta com desconto negativo', () => {
    expect(totalWithDiscount(10, 15)).toBe(0);
    expect(totalWithDiscount(10, -5)).toBe(10);
  });
});
