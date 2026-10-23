// Reproduz no PGlite um comportamento do Supabase real: funções novas do schema public
// recebem EXECUTE direto para anon e authenticated (privilégios padrão). Os outros testes
// do banco não simulam isso, por isso o achado só apareceu no Supabase local.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const SUPABASE = fileURLToPath(new URL('..', import.meta.url));
const sql = (file) => readFileSync(`${SUPABASE}/${file}`, 'utf8');

const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  -- Como no Supabase: toda função nova do public já nasce executável por anon e authenticated.
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

const FUNCTIONS = [
  'public.create_order(uuid, jsonb, text, numeric, text, text, text, text, text)',
  'public.advance_order(uuid)',
  'public.cancel_order(uuid)',
  'public.rate_order(uuid, integer, text)',
  'public.check_coupon(uuid, jsonb, text)',
];

let db;

const can = async (role, fn) =>
  (
    await db.query('select has_function_privilege($1, $2, $3) as ok', [
      role,
      fn,
      'execute',
    ])
  ).rows[0].ok;

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(sql('schema.sql'));
  await db.exec(sql('seed.sql'));
  await db.exec(sql('extras/01-avaliacao.sql'));
  await db.exec(sql('extras/02-cupons.sql'));
});

after(async () => {
  await db.close();
});

describe('permissões das funções (como no Supabase real)', () => {
  it('reproduz o achado: sem o extra 3, visitante executa funções do guia', async () => {
    assert.equal(await can('anon', 'public.advance_order(uuid)'), true);
    assert.equal(await can('anon', 'public.cancel_order(uuid)'), true);
    assert.equal(await can('anon', 'public.rate_order(uuid, integer, text)'), true);
  });

  it('com o extra 3, nenhuma função é executável por visitante; logado continua podendo', async () => {
    await db.exec(sql('extras/03-permissoes.sql'));
    await db.exec(sql('extras/03-permissoes.sql')); // pode ser executado mais de uma vez
    for (const fn of FUNCTIONS) {
      assert.equal(await can('anon', fn), false, `anon ainda executa ${fn}`);
      assert.equal(await can('authenticated', fn), true, `authenticated perdeu ${fn}`);
    }
    assert.equal(
      await can('authenticated', 'public.coupon_discount(uuid, uuid, numeric, text)'),
      false,
    );
  });
});
