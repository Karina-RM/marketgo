import { z } from 'zod';

// Mesmas regras da função rate_order no banco: o app valida para avisar cedo,
// mas quem decide é o banco.
export const MAX_RATING_COMMENT = 280;

export const ratingSchema = z.object({
  stars: z
    .number()
    .int()
    .min(1, 'Escolha de 1 a 5 estrelas')
    .max(5, 'Escolha de 1 a 5 estrelas'),
  comment: z
    .string()
    .trim()
    .max(MAX_RATING_COMMENT, `Máximo de ${MAX_RATING_COMMENT} caracteres`),
});

export type RatingFormData = z.infer<typeof ratingSchema>;
