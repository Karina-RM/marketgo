import { makeCheckoutSchema } from '@/schemas/checkout';

const valid = {
  street: 'Rua das Flores',
  number: '120',
  neighborhood: 'Centro',
  complement: '',
  payment: 'pix' as const,
  changeFor: '',
};

describe('makeCheckoutSchema', () => {
  const schema = makeCheckoutSchema(46.3);
  const errorsOf = (data: unknown) => {
    const r = schema.safeParse(data);
    return r.success
      ? []
      : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`);
  };

  it('aceita um pedido completo', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('exige rua, número e bairro', () => {
    expect(errorsOf({ ...valid, street: 'ab', number: '', neighborhood: ' ' })).toEqual([
      'street: Informe a rua',
      'number: Informe o número',
      'neighborhood: Informe o bairro',
    ]);
  });

  it('troco: só é validado em dinheiro', () => {
    expect(schema.safeParse({ ...valid, payment: 'pix', changeFor: '10' }).success).toBe(
      true,
    );
    expect(errorsOf({ ...valid, payment: 'cash', changeFor: '30' })).toEqual([
      'changeFor: O troco deve cobrir o total do pedido',
    ]);
    expect(errorsOf({ ...valid, payment: 'cash', changeFor: 'abc' })).toEqual([
      'changeFor: Valor inválido',
    ]);
    expect(
      schema.safeParse({ ...valid, payment: 'cash', changeFor: '50,00' }).success,
    ).toBe(true);
    expect(schema.safeParse({ ...valid, payment: 'cash', changeFor: '' }).success).toBe(
      true,
    );
  });

  it('recusa forma de pagamento desconhecida', () => {
    expect(schema.safeParse({ ...valid, payment: 'boleto' }).success).toBe(false);
  });
});
