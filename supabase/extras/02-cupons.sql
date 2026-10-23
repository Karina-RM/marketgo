-- MarketGo, extra 2 do banco: cupons de desconto validados dentro de create_order.
-- Sugestão do guia (Apêndice C, nível intermediário): regras de negócio em SQL e testes no PGlite.
--
-- Execute DEPOIS de schema.sql e seed.sql. O arquivo pode ser executado mais de uma vez.
--
-- Mesma ideia do guia: o app NÃO calcula o desconto. Ele só envia o código digitado; o banco
-- confere o cupom, calcula o desconto sobre o subtotal (com os preços do banco) e grava tudo.
-- O app nem consegue ler a tabela de cupons (não há política nem grant de leitura).

-- 1) Cupons ---------------------------------------------------------------
create table if not exists public.coupons (
  code         text primary key check (code = upper(code) and code ~ '^[A-Z0-9]{3,20}$'),
  description  text not null,
  kind         text not null check (kind in ('percent', 'fixed')),
  value        numeric(8, 2) not null check (value > 0),
  min_subtotal numeric(8, 2) not null default 0 check (min_subtotal >= 0),
  store_id     uuid references public.stores (id) on delete cascade, -- null = todas as lojas
  valid_until  timestamptz,                                          -- null = sem validade
  is_active    boolean not null default true,
  check (kind <> 'percent' or value <= 100)
);

alter table public.coupons enable row level security;
-- Sem políticas e sem grant: ninguém lê os cupons pela API. Só as funções abaixo.

-- 2) Pedidos guardam o cupom e o desconto (snapshot, como os preços) ------
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount numeric(10, 2) not null default 0 check (discount >= 0);

-- 3) Regras do cupom: um único lugar, usado pela prévia e pela criação do pedido
create or replace function public.coupon_discount(
  p_user uuid,
  p_store_id uuid,
  p_subtotal numeric,
  p_code text
)
returns table (code text, discount numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_coupon public.coupons;
begin
  if v_code = '' then
    return query select null::text, 0::numeric;
    return;
  end if;

  select * into v_coupon from public.coupons c where c.code = v_code;
  if not found or not v_coupon.is_active
     or (v_coupon.valid_until is not null and v_coupon.valid_until < now()) then
    raise exception 'Cupom inválido ou expirado.';
  end if;
  if v_coupon.store_id is not null and v_coupon.store_id <> p_store_id then
    raise exception 'Este cupom não vale para esta loja.';
  end if;
  if p_subtotal < v_coupon.min_subtotal then
    raise exception 'Este cupom exige subtotal mínimo de R$ %.',
      replace(trim(to_char(v_coupon.min_subtotal, 'FM999990.00')), '.', ',');
  end if;
  -- Um uso por pessoa; pedidos cancelados não contam.
  if exists (
    select 1 from public.orders o
    where o.user_id = p_user and o.coupon_code = v_code and o.status <> 'cancelled'
  ) then
    raise exception 'Você já usou este cupom.';
  end if;

  return query select v_code,
    case v_coupon.kind
      when 'percent' then round(p_subtotal * v_coupon.value / 100, 2)
      else least(v_coupon.value, p_subtotal)
    end;
end;
$$;

-- Interna: não fica exposta na API.
revoke all on function public.coupon_discount(uuid, uuid, numeric, text) from public;
revoke all on function public.coupon_discount(uuid, uuid, numeric, text) from anon, authenticated;

-- 4) Prévia para o checkout: confere o cupom com o subtotal calculado no banco
create or replace function public.check_coupon(p_store_id uuid, p_items jsonb, p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(10, 2);
  v_result record;
  v_description text;
begin
  if auth.uid() is null then
    raise exception 'Faça login para usar um cupom.';
  end if;
  if coalesce(btrim(p_code), '') = '' then
    raise exception 'Informe o código do cupom.';
  end if;

  select sum(p.price * i.quantity) into v_subtotal
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
  join public.products p
    on p.id = i.product_id and p.store_id = p_store_id and p.is_active
  where i.quantity between 1 and 20;

  select * into v_result
  from public.coupon_discount(auth.uid(), p_store_id, coalesce(v_subtotal, 0), p_code);

  select c.description into v_description from public.coupons c where c.code = v_result.code;

  return jsonb_build_object(
    'code', v_result.code,
    'description', v_description,
    'discount', v_result.discount
  );
end;
$$;

-- 5) create_order com cupom ---------------------------------------------
-- A função do guia tinha 8 parâmetros. Para não existirem duas versões (a API não saberia
-- qual chamar), removemos a antiga e criamos a nova com o 9º parâmetro opcional p_coupon.
-- Sem cupom, o comportamento é exatamente o do guia.
drop function if exists public.create_order(uuid, jsonb, text, numeric, text, text, text, text);

create or replace function public.create_order(
  p_store_id uuid,
  p_items jsonb,
  p_payment text,
  p_change_for numeric,
  p_street text,
  p_number text,
  p_neighborhood text,
  p_complement text,
  p_coupon text default null
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
  v_discount numeric(10, 2) := 0;
  v_coupon_code text;
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

  -- O pedido mínimo vale para o subtotal dos produtos, antes do desconto.
  if v_subtotal < v_store.min_order then
    raise exception 'O pedido mínimo desta loja é R$ %.',
      replace(trim(to_char(v_store.min_order, 'FM999990.00')), '.', ',');
  end if;

  select d.code, d.discount into v_coupon_code, v_discount
  from public.coupon_discount(v_user, p_store_id, v_subtotal, p_coupon) d;

  v_total := v_subtotal - v_discount + v_store.delivery_fee;

  if p_payment = 'cash' and p_change_for is not null and p_change_for < v_total then
    raise exception 'O troco deve ser para um valor maior ou igual ao total do pedido.';
  end if;

  insert into public.orders (
    user_id, store_id, store_name, payment_method, change_for,
    address_street, address_number, address_neighborhood, address_complement,
    subtotal, delivery_fee, total, coupon_code, discount
  ) values (
    v_user, v_store.id, v_store.name, p_payment,
    case when p_payment = 'cash' then p_change_for end,
    trim(p_street), trim(p_number), trim(p_neighborhood), nullif(trim(p_complement), ''),
    v_subtotal, v_store.delivery_fee, v_total, v_coupon_code, v_discount
  ) returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, name, emoji, unit_price, quantity, total_price)
  select v_order_id, p.id, p.name, p.emoji, p.price, i.quantity, p.price * i.quantity
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
  join public.products p on p.id = i.product_id;

  return v_order_id;
end;
$$;

-- "from public" não remove permissões dadas direto a um papel (o Supabase costuma dar
-- execute para anon por padrão em funções novas). Por isso fechamos anon explicitamente.
revoke all on function
  public.create_order(uuid, jsonb, text, numeric, text, text, text, text, text) from public, anon;
revoke all on function public.check_coupon(uuid, jsonb, text) from public, anon;
grant execute on function
  public.create_order(uuid, jsonb, text, numeric, text, text, text, text, text) to authenticated;
grant execute on function public.check_coupon(uuid, jsonb, text) to authenticated;

-- 6) Cupons de exemplo --------------------------------------------------
insert into public.coupons (code, description, kind, value, min_subtotal, store_id, valid_until, is_active)
values
  ('BEMVINDO10', '10% de desconto no primeiro uso, em qualquer loja', 'percent', 10, 30, null, null, true),
  ('PADARIA5', 'R$ 5,00 de desconto na Padaria Pão Quente', 'fixed', 5, 15,
     (select id from public.stores where name = 'Padaria Pão Quente'), null, true),
  ('VERAO2025', 'Cupom de uma campanha que já terminou', 'percent', 15, 0, null, '2025-03-20', true),
  ('PAUSADO', 'Cupom desativado pela loja', 'fixed', 10, 0, null, null, false)
on conflict (code) do nothing;

-- Avisa a API (PostgREST) que as funções mudaram.
notify pgrst, 'reload schema';
