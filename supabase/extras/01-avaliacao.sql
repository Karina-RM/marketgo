-- MarketGo, extra 1 do banco: avaliação do pedido (1 a 5 estrelas) após a entrega.
-- Sugestão do guia (Apêndice C, nível iniciante): nova tabela, RLS e componente de estrelas.
--
-- Execute DEPOIS de schema.sql e seed.sql. O arquivo pode ser executado mais de uma vez.
--
-- Mesmo padrão de segurança dos pedidos: o app só LÊ as próprias avaliações. Não existe
-- política de insert, update ou delete; quem grava é a função rate_order, que confere
-- dono, status do pedido, nota e se o pedido já foi avaliado.

create table if not exists public.order_ratings (
  order_id   uuid primary key references public.orders (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  stars      int  not null check (stars between 1 and 5),
  comment    text check (comment is null or char_length(comment) <= 280),
  created_at timestamptz not null default now()
);

alter table public.order_ratings enable row level security;

drop policy if exists "Avaliações: ler as próprias" on public.order_ratings;
create policy "Avaliações: ler as próprias"
  on public.order_ratings for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.order_ratings to authenticated;

create or replace function public.rate_order(
  p_order_id uuid,
  p_stars int,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Faça login para avaliar um pedido.';
  end if;

  -- Só o dono encontra o pedido; para os outros, ele "não existe".
  select status into v_status
  from public.orders
  where id = p_order_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_status <> 'delivered' then
    raise exception 'Só é possível avaliar um pedido entregue.';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'A avaliação deve ter de 1 a 5 estrelas.';
  end if;
  if char_length(v_comment) > 280 then
    raise exception 'O comentário pode ter até 280 caracteres.';
  end if;
  if exists (select 1 from public.order_ratings where order_id = p_order_id) then
    raise exception 'Este pedido já foi avaliado.';
  end if;

  insert into public.order_ratings (order_id, user_id, stars, comment)
  values (p_order_id, auth.uid(), p_stars, v_comment);
end;
$$;

revoke all on function public.rate_order(uuid, int, text) from public;
grant execute on function public.rate_order(uuid, int, text) to authenticated;

-- Avisa a API (PostgREST) que existe uma tabela e uma função novas.
notify pgrst, 'reload schema';
