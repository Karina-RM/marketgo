import { supabase } from '@/lib/supabase';
import type { OrderRating } from '@/types';

// A RLS só devolve a avaliação se ela for do usuário logado.
export async function getRating(orderId: string): Promise<OrderRating | null> {
  const { data, error } = await supabase
    .from('order_ratings')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data as OrderRating | null;
}

// A ÚNICA forma de gravar: a função rate_order confere dono, status, nota e duplicidade.
export async function rateOrder(input: {
  orderId: string;
  stars: number;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.rpc('rate_order', {
    p_order_id: input.orderId,
    p_stars: input.stars,
    p_comment: input.comment,
  });
  if (error) throw error;
}
