import type { Product, Store, StoreCategory } from '@/types';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Busca por nome, categoria ou descrição (sem acento nem maiúsculas) e filtro por categoria.
export function filterStores(
  stores: Store[],
  query: string,
  category: StoreCategory | null,
): Store[] {
  const q = normalize(query.trim());
  return stores.filter((s) => {
    if (category && s.category !== category) return false;
    return !q || normalize(`${s.name} ${s.category} ${s.description}`).includes(q);
  });
}

// Lojas abertas primeiro; dentro de cada grupo, melhor avaliação primeiro.
export function sortStores(stores: Store[]): Store[] {
  return [...stores].sort(
    (a, b) => Number(b.is_open) - Number(a.is_open) || b.rating - a.rating,
  );
}

export interface ProductSection {
  title: string;
  data: Product[];
}

// Agrupa por seção mantendo a ordem em que cada seção aparece pela primeira vez.
export function groupProducts(products: Product[]): ProductSection[] {
  const sections = new Map<string, Product[]>();
  for (const p of products) {
    const list = sections.get(p.section);
    if (list) list.push(p);
    else sections.set(p.section, [p]);
  }
  return Array.from(sections, ([title, data]) => ({ title, data }));
}

export const formatEta = (min: number, max: number) => `${min}–${max} min`;
