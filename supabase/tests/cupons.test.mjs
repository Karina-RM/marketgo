// Testes do extra "cupons de desconto" (supabase/extras/02-cupons.sql) com PGlite.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const SUPABASE = fileURLToPath(new URL('..', import.meta.url));
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CAROL = '33333333-3333-3333-3333-333333333333';
const M = 'Mercado Bom Preço';
const P = 'Padaria Pão Quente';

const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  insert into auth.users (id) values ('${ALICE}'), ('${BOB}'), ('${CAROL}');
`;

let db;

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync(`${SUPABASE}/schema.sql`, 'utf8'));
  await db.exec(readFileSync(`${SUPABASE}/seed.sql`, 'utf8'));
  await db.exec(readFileSync(`${SUPABASE}/extras/01-avaliacao.sql`, 'utf8'));
  // Pode ser executado mais de uma vez: aplicamos duas vezes de propósito.
  const extra = readFileSync(`${SUPABASE}/extras/02-cupons.sql`, 'utf8');
  await db.exec(extra);
  await db.exec(extra);
});

after(async () => {
  await db.close();
});

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
const storeId = async (name) =>
  (await one('select id from stores where name = $1', [name])).id;
const item = async (name, store, quantity = 1) => ({
  product_id: (
    await one(
      `select p.id from products p join stores s on s.id = p.store_id
       where p.name = $1 and s.name = $2`,
      [name, store],
    )
  ).id,
  quantity,
});

async function createOrder(uid, store, items, coupon = null, o = {}) {
  const sid = await storeId(store);
  return as(uid, async () => {
    const r = await one(
      `select public.create_order($1, $2::jsonb, $3, $4, 'Rua A', '1', 'Centro', null, $5) as id`,
      [sid, JSON.stringify(items), o.payment ?? 'pix', o.changeFor ?? null, coupon],
    );
    return r.id;
  });
}

const order = (id) =>
  one(
    'select subtotal, discount, delivery_fee, total, coupon_code from orders where id = $1',
    [id],
  );

describe('cupons de desconto', () => {
  it('sem cupom, o pedido continua igual ao do guia', async () => {
    const id = await createOrder(ALICE, M, [
      await item('Leite integral 1 L', M, 2),
      await item('Arroz branco 5 kg', M),
    ]);
    assert.deepEqual(await order(id), {
      subtotal: '40.40',
      discount: '0.00',
      delivery_fee: '5.90',
      total: '46.30',
      coupon_code: null,
    });
  });

  it('cupom percentual: desconto sobre o subtotal, calculado no banco', async () => {
    // Arroz 29,90 + Café 18,90 = 48,80; 10% = 4,88; total = 48,80 − 4,88 + 5,90 = 49,82
    const id = await createOrder(
      ALICE,
      M,
      [await item('Arroz branco 5 kg', M), await item('Café torrado 500 g', M)],
      ' bemvindo10 ',
    );
    assert.deepEqual(await order(id), {
      subtotal: '48.80',
      discount: '4.88',
      delivery_fee: '5.90',
      total: '49.82',
      coupon_code: 'BEMVINDO10',
    });
  });

  it('cupom de valor fixo só vale na loja dele', async () => {
    const pao = await item('Pão de queijo (10 un)', P, 2); // 24,00
    const id = await createOrder(BOB, P, [pao], 'PADARIA5');
    assert.equal((await order(id)).total, '22.50'); // 24,00 − 5,00 + 3,50
    await assert.rejects(
      createOrder(ALICE, M, [await item('Arroz branco 5 kg', M)], 'PADARIA5'),
      /Este cupom não vale para esta loja\./,
    );
  });

  it('recusa cupom desconhecido, expirado ou desativado', async () => {
    const arroz = [await item('Arroz branco 5 kg', M)];
    for (const code of ['NAOEXISTE', 'VERAO2025', 'PAUSADO']) {
      await assert.rejects(
        createOrder(BOB, M, arroz, code),
        /Cupom inválido ou expirado\./,
      );
    }
  });

  it('exige o subtotal mínimo do cupom', async () => {
    // Pão de queijo 12,00: atinge o mínimo da loja (10,00), mas não o do cupom (15,00)
    await assert.rejects(
      createOrder(ALICE, P, [await item('Pão de queijo (10 un)', P)], 'PADARIA5'),
      /subtotal mínimo de R\$ 15,00\./,
    );
  });

  it('cada pessoa usa o cupom uma vez; pedido cancelado devolve o cupom', async () => {
    const arroz = [
      await item('Arroz branco 5 kg', M),
      await item('Café torrado 500 g', M),
    ];
    const first = await createOrder(BOB, M, arroz, 'BEMVINDO10');
    await assert.rejects(
      createOrder(BOB, M, arroz, 'BEMVINDO10'),
      /Você já usou este cupom\./,
    );
    await as(BOB, () => db.query('select public.cancel_order($1)', [first]));
    const again = await createOrder(BOB, M, arroz, 'BEMVINDO10');
    assert.equal((await order(again)).coupon_code, 'BEMVINDO10');
  });

  it('a prévia do checkout dá o mesmo desconto que o pedido', async () => {
    const sid = await storeId(P);
    const items = [
      await item('Pão de queijo (10 un)', P),
      await item('Bolo de cenoura (fatia)', P),
    ]; // 19,50
    const preview = await as(ALICE, () =>
      one('select public.check_coupon($1, $2::jsonb, $3) as r', [
        sid,
        JSON.stringify(items),
        'padaria5',
      ]),
    );
    assert.equal(preview.r.code, 'PADARIA5');
    assert.equal(Number(preview.r.discount), 5);
    const id = await createOrder(ALICE, P, items, 'PADARIA5');
    assert.equal((await order(id)).discount, '5.00');
  });

  it('o troco é conferido com o total já com desconto', async () => {
    // 48,80 de produtos: com BEMVINDO10 o total é 49,82; sem cupom seria 54,70
    const items = [
      await item('Arroz branco 5 kg', M),
      await item('Café torrado 500 g', M),
    ];
    await assert.rejects(
      createOrder(CAROL, M, items, null, { payment: 'cash', changeFor: 49.9 }),
      /troco/,
    );
    const id = await createOrder(CAROL, M, items, 'BEMVINDO10', {
      payment: 'cash',
      changeFor: 49.9,
    });
    assert.equal((await order(id)).total, '49.82');
  });

  it('o app não lê a tabela de cupons nem chama a regra interna; visitante não usa cupom', async () => {
    await assert.rejects(
      as(ALICE, () => db.query('select * from coupons')),
      /permission denied/,
    );
    await assert.rejects(
      as(ALICE, () =>
        db.query(
          "select * from public.coupon_discount($1, gen_random_uuid(), 100, 'BEMVINDO10')",
          [ALICE],
        ),
      ),
      /permission denied/,
    );
    await db.exec('set role anon');
    try {
      await assert.rejects(
        db.query(
          "select public.check_coupon(gen_random_uuid(), '[]'::jsonb, 'BEMVINDO10')",
        ),
        /permission denied/,
      );
    } finally {
      await db.exec('reset role');
    }
  });
});
