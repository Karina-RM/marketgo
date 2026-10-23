// Testes do banco com PGlite (Postgres real, rodando dentro do Node, sem Docker).
// Aplicamos o MESMO schema.sql e seed.sql que você roda no Supabase.
// Execução: node --test supabase/tests/   (ou npm run test:db)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const SUPABASE = fileURLToPath(new URL('..', import.meta.url));
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const M = 'Mercado Bom Preço';

// O que o Supabase já oferece e o Postgres puro não tem: o schema "auth", a função
// auth.uid() (lê o usuário do "token") e os papéis anon e authenticated.
const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  insert into auth.users (id) values ('${ALICE}'), ('${BOB}');
`;

let db;

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync(`${SUPABASE}/schema.sql`, 'utf8'));
  await db.exec(readFileSync(`${SUPABASE}/seed.sql`, 'utf8'));
});

after(async () => {
  await db.close();
});

// Executa como um usuário logado (uid) ou como visitante logado sem sessão (uid = null).
async function as(uid, fn) {
  await db.exec(
    `set role authenticated;
     select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const storeId = async (name) =>
  (await one('select id from stores where name = $1', [name])).id;
const productId = async (name, store) =>
  (
    await one(
      `select p.id from products p join stores s on s.id = p.store_id
       where p.name = $1 and s.name = $2`,
      [name, store],
    )
  ).id;

async function createOrder(uid, store, items, o = {}) {
  const sid = await storeId(store);
  return as(uid, async () => {
    const r = await db.query(
      'select public.create_order($1, $2::jsonb, $3, $4, $5, $6, $7, $8) as id',
      [
        sid,
        JSON.stringify(items),
        o.payment ?? 'pix',
        o.changeFor ?? null,
        o.street ?? 'Rua das Flores',
        o.number ?? '120',
        o.neighborhood ?? 'Centro',
        o.complement ?? null,
      ],
    );
    return r.rows[0].id;
  });
}

const advance = (uid, id) =>
  as(uid, async () => (await one('select public.advance_order($1) as s', [id])).s);

describe('leitura e permissões', () => {
  it('usuário logado lê lojas e só os produtos ativos', async () => {
    assert.equal((await as(ALICE, () => rows('select id from stores'))).length, 6);
    const pid = await productId('Detergente 500 ml', M);
    await db.query('update products set is_active = false where id = $1', [pid]);
    assert.equal(
      (await as(ALICE, () => rows('select id from products where id = $1', [pid])))
        .length,
      0,
    );
    await db.query('update products set is_active = true where id = $1', [pid]);
  });

  it('o app não consegue inserir pedidos diretamente', async () => {
    const sid = await storeId(M);
    await assert.rejects(
      as(ALICE, () =>
        db.query(
          `insert into orders (store_id, store_name, payment_method,
             address_street, address_number, address_neighborhood,
             subtotal, delivery_fee, total)
           values ($1, 'x', 'pix', 'r', '1', 'b', 1, 0, 1)`,
          [sid],
        ),
      ),
      /permission denied/,
    );
  });

  it('visitante (anon) não executa as funções', async () => {
    await db.exec('set role anon');
    try {
      await assert.rejects(
        db.query('select public.advance_order(gen_random_uuid())'),
        /permission denied/,
      );
    } finally {
      await db.exec('reset role');
    }
  });
});

describe('create_order', () => {
  it('calcula o total no servidor e guarda os itens (snapshot)', async () => {
    const leite = await productId('Leite integral 1 L', M);
    const arroz = await productId('Arroz branco 5 kg', M);
    const id = await createOrder(ALICE, M, [
      { product_id: leite, quantity: 2 },
      { product_id: arroz, quantity: 1 },
    ]);

    const order = await one('select * from orders where id = $1', [id]);
    assert.equal(order.status, 'received');
    assert.equal(order.subtotal, '40.40');
    assert.equal(order.delivery_fee, '5.90');
    assert.equal(order.total, '46.30');
    assert.equal(order.store_name, M);
    assert.equal(order.user_id, ALICE);

    const items = await rows(
      'select name, quantity, total_price from order_items where order_id = $1 order by name',
      [id],
    );
    assert.deepEqual(items, [
      { name: 'Arroz branco 5 kg', quantity: 1, total_price: '29.90' },
      { name: 'Leite integral 1 L', quantity: 2, total_price: '10.50' },
    ]);

    // o preço muda depois, mas o pedido antigo continua igual
    await db.query('update products set price = 99 where id = $1', [leite]);
    assert.equal(
      (
        await one(
          'select unit_price from order_items where order_id = $1 and product_id = $2',
          [id, leite],
        )
      ).unit_price,
      '5.25',
    );
    await db.query('update products set price = 5.25 where id = $1', [leite]);
  });

  it('respeita o pedido mínimo da loja', async () => {
    const pao = await productId('Pão francês (6 un)', 'Padaria Pão Quente');
    await assert.rejects(
      createOrder(ALICE, 'Padaria Pão Quente', [{ product_id: pao, quantity: 1 }]),
      /O pedido mínimo desta loja é R\$ 10,00\./,
    );
  });

  it('recusa loja fechada', async () => {
    const combo = await productId('Combo 20 peças', 'Sushi Sakura');
    await assert.rejects(
      createOrder(ALICE, 'Sushi Sakura', [{ product_id: combo, quantity: 1 }]),
      /A loja está fechada no momento\./,
    );
  });

  it('recusa itens inválidos: outra loja, inativo, quantidade e repetidos', async () => {
    const leite = await productId('Leite integral 1 L', M);
    const pizza = await productId('Margherita', 'Pizzaria Forno a Lenha');
    const invalid = /Há itens inválidos no carrinho/;

    await assert.rejects(
      createOrder(ALICE, M, [{ product_id: pizza, quantity: 1 }]),
      invalid,
    );
    await assert.rejects(
      createOrder(ALICE, M, [{ product_id: leite, quantity: 0 }]),
      invalid,
    );
    await assert.rejects(
      createOrder(ALICE, M, [{ product_id: leite, quantity: 21 }]),
      invalid,
    );
    await assert.rejects(
      createOrder(ALICE, M, [
        { product_id: leite, quantity: 1 },
        { product_id: leite, quantity: 2 },
      ]),
      invalid,
    );

    await db.query('update products set is_active = false where id = $1', [leite]);
    await assert.rejects(
      createOrder(ALICE, M, [{ product_id: leite, quantity: 5 }]),
      invalid,
    );
    await db.query('update products set is_active = true where id = $1', [leite]);
  });

  it('valida carrinho vazio, login, endereço e pagamento', async () => {
    const arroz = await productId('Arroz branco 5 kg', M);
    const item = [{ product_id: arroz, quantity: 1 }];
    await assert.rejects(createOrder(ALICE, M, []), /O carrinho está vazio\./);
    await assert.rejects(createOrder(null, M, item), /Faça login para fazer um pedido\./);
    await assert.rejects(
      createOrder(ALICE, M, item, { street: ' ' }),
      /Endereço de entrega incompleto\./,
    );
    await assert.rejects(
      createOrder(ALICE, M, item, { payment: 'boleto' }),
      /Forma de pagamento inválida\./,
    );
  });

  it('troco: só vale em dinheiro e precisa cobrir o total', async () => {
    const arroz = await productId('Arroz branco 5 kg', M); // 29,90 + 5,90 = 35,80
    const item = [{ product_id: arroz, quantity: 1 }];
    await assert.rejects(
      createOrder(ALICE, M, item, { payment: 'cash', changeFor: 30 }),
      /troco/,
    );
    const cash = await createOrder(ALICE, M, item, { payment: 'cash', changeFor: 50 });
    const card = await createOrder(ALICE, M, item, { payment: 'card', changeFor: 50 });
    assert.equal(
      (await one('select change_for from orders where id = $1', [cash])).change_for,
      '50.00',
    );
    assert.equal(
      (await one('select change_for from orders where id = $1', [card])).change_for,
      null,
    );
  });
});

describe('privacidade e status', () => {
  it('cada usuário só vê os próprios pedidos e itens', async () => {
    const arroz = await productId('Arroz branco 5 kg', M);
    const id = await createOrder(BOB, M, [{ product_id: arroz, quantity: 1 }]);
    assert.equal(
      (await as(ALICE, () => rows('select id from orders where id = $1', [id]))).length,
      0,
    );
    assert.equal(
      (await as(BOB, () => rows('select id from orders where id = $1', [id]))).length,
      1,
    );
    assert.equal(
      (
        await as(ALICE, () =>
          rows('select id from order_items where order_id = $1', [id]),
        )
      ).length,
      0,
    );
    assert.ok(
      (await as(BOB, () => rows('select id from order_items where order_id = $1', [id])))
        .length > 0,
    );
  });

  it('o pedido avança na ordem certa e para em entregue', async () => {
    const arroz = await productId('Arroz branco 5 kg', M);
    const id = await createOrder(ALICE, M, [{ product_id: arroz, quantity: 1 }]);
    assert.equal(await advance(ALICE, id), 'preparing');
    assert.equal(await advance(ALICE, id), 'out_for_delivery');
    assert.equal(await advance(ALICE, id), 'delivered');
    await assert.rejects(advance(ALICE, id), /Este pedido não pode avançar\./);
  });

  it('outro usuário não avança nem cancela o pedido alheio', async () => {
    const arroz = await productId('Arroz branco 5 kg', M);
    const id = await createOrder(ALICE, M, [{ product_id: arroz, quantity: 1 }]);
    await assert.rejects(advance(BOB, id), /Pedido não encontrado\./);
    await assert.rejects(
      as(BOB, () => db.query('select public.cancel_order($1)', [id])),
      /Pedido não encontrado\./,
    );
  });

  it('só cancela enquanto o pedido está recebido', async () => {
    const arroz = await productId('Arroz branco 5 kg', M);
    const a = await createOrder(ALICE, M, [{ product_id: arroz, quantity: 1 }]);
    await as(ALICE, () => db.query('select public.cancel_order($1)', [a]));
    assert.equal(
      (await one('select status from orders where id = $1', [a])).status,
      'cancelled',
    );
    await assert.rejects(advance(ALICE, a), /Este pedido não pode avançar\./);

    const b = await createOrder(ALICE, M, [{ product_id: arroz, quantity: 1 }]);
    await advance(ALICE, b);
    await assert.rejects(
      as(ALICE, () => db.query('select public.cancel_order($1)', [b])),
      /cancelar/,
    );
  });
});
