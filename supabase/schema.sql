-- MarketGo: esquema do banco (execute no SQL Editor do Supabase)

-- 1) Catálogo -----------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null
    check (category in ('Mercado', 'Padaria', 'Farmácia', 'Restaurante', 'Hortifrúti')),
  emoji text not null,
  description text not null default '',
  rating numeric(2, 1) not null default 4.5 check (rating between 0 and 5),
  delivery_fee numeric(8, 2) not null default 0 check (delivery_fee >= 0),
  eta_min int not null default 30 check (eta_min > 0),
  eta_max int not null default 45 check (eta_max >= eta_min),
  min_order numeric(8, 2) not null default 0 check (min_order >= 0),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  section text not null,
  name text not null,
  description text not null default '',
  price numeric(8, 2) not null check (price > 0),
  emoji text not null,
  is_active boolean not null default true
);

create index products_store_idx on public.products (store_id, section, name);

-- 2) Pedidos ------------------------------------------------------------
-- Os textos da loja e dos itens são copiados no momento da compra ("snapshot"):
-- se o preço mudar depois, o pedido antigo continua igual.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,

  store_id uuid not null references public.stores (id),
  store_name text not null,
  status text not null default 'received'
    check (status in ('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('pix', 'card', 'cash')),
  change_for numeric(8, 2) check (change_for is null or change_for > 0),
  address_street text not null,
  address_number text not null,
  address_neighborhood text not null,
  address_complement text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(8, 2) not null check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  emoji text not null,
  unit_price numeric(8, 2) not null check (unit_price > 0),
  quantity int not null check (quantity between 1 and 20),
  total_price numeric(10, 2) not null check (total_price > 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- 3) Segurança: Row Level Security --------------------------------------
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Lojas: leitura para usuários logados"
  on public.stores for select to authenticated using (true);

create policy "Produtos: leitura dos ativos"
  on public.products for select to authenticated using (is_active);

create policy "Pedidos: ler os próprios"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Itens: ler os dos próprios pedidos"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
  );

-- Repare: NÃO existe política de insert, update ou delete em orders e order_items.
-- O app não escreve pedidos diretamente. Só as funções abaixo escrevem, e são elas
-- que calculam preços e controlam o status.

grant select on public.stores, public.products to authenticated;
grant select on public.orders, public.order_items to authenticated;

-- 4) Funções (RPC): a única porta de escrita dos pedidos -----------------
create or replace function public.create_order(
  p_store_id uuid,
  p_items jsonb,
  p_payment text,
  p_change_for numeric,
  p_street text,
  p_number text,
  p_neighborhood text,
  p_complement text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_store public.stores;
  v_count int;
  v_subtotal numeric(10, 2);
  v_total numeric(10, 2);
  v_order_id uuid;
begin
  if v_user is null then
    raise exception 'Faça login para fazer um pedido.';
  end if;

  select * into v_store from public.stores where id = p_store_id;
  if not found then
    raise exception 'Loja não encontrada.';
  end if;
  if not v_store.is_open then
    raise exception 'A loja está fechada no momento.';
  end if;

  if p_payment not in ('pix', 'card', 'cash') then
    raise exception 'Forma de pagamento inválida.';
  end if;
  if coalesce(trim(p_street), '') = '' or coalesce(trim(p_number), '') = ''
     or coalesce(trim(p_neighborhood), '') = '' then
    raise exception 'Endereço de entrega incompleto.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'O carrinho está vazio.';
  end if;

  -- Cada item precisa existir, estar ativo, ser desta loja, ter quantidade de 1 a 20
  -- e não pode se repetir. Os PREÇOS vêm do banco, nunca do app.
  select count(*) into v_count
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
  join public.products p
    on p.id = i.product_id and p.store_id = p_store_id and p.is_active
  where i.quantity between 1 and 20;

  if v_count <> jsonb_array_length(p_items)
     or (select count(distinct e ->> 'product_id') from jsonb_array_elements(p_items) e)
        <> jsonb_array_length(p_items) then
    raise exception 'Há itens inválidos no carrinho. Atualize e tente de novo.';
  end if;

  select sum(p.price * i.quantity) into v_subtotal
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
  join public.products p on p.id = i.product_id;

  if v_subtotal < v_store.min_order then
    raise exception 'O pedido mínimo desta loja é R$ %.',
      replace(trim(to_char(v_store.min_order, 'FM999990.00')), '.', ',');
  end if;

  v_total := v_subtotal + v_store.delivery_fee;

  if p_payment = 'cash' and p_change_for is not null and p_change_for < v_total then
    raise exception 'O troco deve ser para um valor maior ou igual ao total do pedido.';
  end if;

  insert into public.orders (
    user_id, store_id, store_name, payment_method, change_for,
    address_street, address_number, address_neighborhood, address_complement,
    subtotal, delivery_fee, total
  ) values (
    v_user, v_store.id, v_store.name, p_payment,
    case when p_payment = 'cash' then p_change_for end,
    trim(p_street), trim(p_number), trim(p_neighborhood), nullif(trim(p_complement), ''),
    v_subtotal, v_store.delivery_fee, v_total
  ) returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, name, emoji, unit_price, quantity, total_price)
  select v_order_id, p.id, p.name, p.emoji, p.price, i.quantity, p.price * i.quantity
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
  join public.products p on p.id = i.product_id;

  return v_order_id;
end;
$$;

-- Modo demonstração: avança o pedido para o próximo status. Em um produto real, quem
-- faz isso é a loja ou o entregador, nunca o cliente.
create or replace function public.advance_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_next text;
begin
  select status into v_status
  from public.orders
  where id = p_order_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  v_next := case v_status
    when 'received' then 'preparing'
    when 'preparing' then 'out_for_delivery'
    when 'out_for_delivery' then 'delivered'
  end;
  if v_next is null then
    raise exception 'Este pedido não pode avançar.';
  end if;

  update public.orders set status = v_next, updated_at = now() where id = p_order_id;
  return v_next;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.orders
  where id = p_order_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_status <> 'received' then
    raise exception 'Só é possível cancelar um pedido que ainda não entrou em preparo.';
  end if;

  update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id;
end;
$$;

-- Por padrão, toda função pode ser executada por qualquer um. Fechamos e liberamos só
-- para quem está logado.
revoke all on function
  public.create_order(uuid, jsonb, text, numeric, text, text, text, text) from public;
revoke all on function public.advance_order(uuid) from public;
revoke all on function public.cancel_order(uuid) from public;
grant execute on function
  public.create_order(uuid, jsonb, text, numeric, text, text, text, text) to authenticated;
grant execute on function public.advance_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
