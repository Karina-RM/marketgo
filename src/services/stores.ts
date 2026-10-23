import { supabase } from '@/lib/supabase';
import type { Product, Store } from '@/types';

export async function listStores(): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Store[];
}

export async function getStore(id: string): Promise<Store> {
  const { data, error } = await supabase.from('stores').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Store;
}

export async function listProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('section')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Product;
}
