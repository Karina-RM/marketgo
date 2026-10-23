import { MAX_RATING_COMMENT, ratingSchema } from '@/schemas/rating';

describe('ratingSchema (extra: avaliação do pedido)', () => {
  it('aceita de 1 a 5 estrelas, com ou sem comentário', () => {
    expect(ratingSchema.safeParse({ stars: 1, comment: '' }).success).toBe(true);
    expect(ratingSchema.safeParse({ stars: 5, comment: 'Ótimo!' }).success).toBe(true);
  });

  it('recusa nota fora do intervalo ou fracionada', () => {
    for (const stars of [0, 6, 4.5]) {
      expect(ratingSchema.safeParse({ stars, comment: '' }).success).toBe(false);
    }
  });

  it('limita o comentário e ignora espaços nas pontas', () => {
    const longo = 'x'.repeat(MAX_RATING_COMMENT + 1);
    expect(ratingSchema.safeParse({ stars: 3, comment: longo }).success).toBe(false);
    const ok = ratingSchema.parse({ stars: 3, comment: '  Bom  ' });
    expect(ok.comment).toBe('Bom');
  });
});
