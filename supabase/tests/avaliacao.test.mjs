// Testes do extra "avaliação do pedido" (supabase/extras/01-avaliacao.sql) com PGlite.
// Mesmo método do db.test.mjs: schema.sql + seed.sql + o extra, num Postgres real em memória.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const SUPABASE = fileURLToPath(new URL('..', import.meta.url));
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const M = 'Mercado Bom Preço';

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
  // O extra pode ser executado mais de uma vez: aplicamos duas vezes de propósito.
  const extra = readFileSync(`${SUPABASE}/extras/01-avaliacao.sql`, 'utf8');
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
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;

async function orderFor(uid, { delivered = true } = {}) {
  const { sid, pid } = await one(
    `select s.id as sid, p.id as pid from products p join stores s on s.id = p.store_id
     where s.name = $1 and p.name = 'Arroz branco 5 kg'`,
    [M],
  );
  return as(uid, async () => {
    const { id } = await one(
      `select public.create_order($1, $2::jsonb, 'pix', null, 'Rua A', '1', 'Centro', null) as id`,
      [sid, JSON.stringify([{ product_id: pid, quantity: 1 }])],
    );
    if (delivered) {
      for (let i = 0; i < 3; i++) await db.query('select public.advance_order($1)', [id]);
    }
    return id;
  });
}

const rate = (uid, id, stars, comment = null) =>
  as(uid, () => db.query('select public.rate_order($1, $2, $3)', [id, stars, comment]));

describe('avaliação do pedido', () => {
  it('o dono avalia um pedido entregue, e o comentário é gravado sem espaços extras', async () => {
    const id = await orderFor(ALICE);
    await rate(ALICE, id, 5, '  Chegou rápido!  ');
    const r = await as(ALICE, () =>
      one('select stars, comment, user_id from order_ratings where order_id = $1', [id]),
    );
    assert.deepEqual(r, { stars: 5, comment: 'Chegou rápido!', user_id: ALICE });
  });

  it('recusa pedido que ainda não foi entregue', async () => {
    const id = await orderFor(ALICE, { delivered: false });
    await assert.rejects(
      rate(ALICE, id, 4),
      /Só é possível avaliar um pedido entregue\./,
    );
  });

  it('recusa nota fora de 1 a 5 e comentário longo', async () => {
    const id = await orderFor(ALICE);
    await assert.rejects(rate(ALICE, id, 0), /de 1 a 5 estrelas/);
    await assert.rejects(rate(ALICE, id, 6), /de 1 a 5 estrelas/);
    await assert.rejects(rate(ALICE, id, 3, 'x'.repeat(281)), /até 280 caracteres/);
  });

  it('cada pedido só pode ser avaliado uma vez', async () => {
    const id = await orderFor(ALICE);
    await rate(ALICE, id, 4);
    await assert.rejects(rate(ALICE, id, 1), /Este pedido já foi avaliado\./);
  });

  it('outro usuário não avalia nem lê a avaliação alheia', async () => {
    const id = await orderFor(ALICE);
    await assert.rejects(rate(BOB, id, 1), /Pedido não encontrado\./);
    await rate(ALICE, id, 5);
    assert.equal(
      (await as(BOB, () => rows('select 1 from order_ratings where order_id = $1', [id])))
        .length,
      0,
    );
  });

  it('o app não grava avaliações direto na tabela, e visitante não executa a função', async () => {
    const id = await orderFor(ALICE);
    await assert.rejects(
      as(ALICE, () =>
        db.query(
          'insert into order_ratings (order_id, user_id, stars) values ($1, $2, 5)',
          [id, ALICE],
        ),
      ),
      /permission denied/,
    );
    await db.exec('set role anon');
    try {
      await assert.rejects(
        db.query('select public.rate_order($1, 5, null)', [id]),
        /permission denied/,
      );
    } finally {
      await db.exec('reset role');
    }
  });
});
