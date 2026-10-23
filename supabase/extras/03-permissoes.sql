-- MarketGo, extra 3 do banco: corrige as permissões de execução das funções para visitantes.
--
-- Achado durante os testes no Supabase local (23/10/2026): o schema.sql do guia faz
--   revoke all on function ... from public;  grant execute ... to authenticated;
-- mas, no Supabase, funções novas do schema public também recebem EXECUTE direto para o
-- papel anon (privilégios padrão do projeto). "from public" não remove essa permissão.
-- Resultado verificado com has_function_privilege('anon', ...): advance_order, cancel_order
-- e rate_order ficavam executáveis por visitantes.
--
-- O risco era baixo (as funções exigem user_id = auth.uid() e respondem "Pedido não
-- encontrado" para visitantes), mas a intenção do guia é "só para quem está logado".
-- Execute DEPOIS de schema.sql, seed.sql e dos outros extras. Pode ser executado mais de uma vez.

revoke execute on function public.advance_order(uuid) from anon;
revoke execute on function public.cancel_order(uuid) from anon;

do $$
begin
  -- Só existem se os extras 1 e 2 foram aplicados.
  if to_regprocedure('public.rate_order(uuid, integer, text)') is not null then
    revoke execute on function public.rate_order(uuid, int, text) from anon;
  end if;
  if to_regprocedure('public.create_order(uuid, jsonb, text, numeric, text, text, text, text, text)') is not null then
    revoke execute on function
      public.create_order(uuid, jsonb, text, numeric, text, text, text, text, text) from anon;
  end if;
  if to_regprocedure('public.create_order(uuid, jsonb, text, numeric, text, text, text, text)') is not null then
    revoke execute on function
      public.create_order(uuid, jsonb, text, numeric, text, text, text, text) from anon;
  end if;
  if to_regprocedure('public.check_coupon(uuid, jsonb, text)') is not null then
    revoke execute on function public.check_coupon(uuid, jsonb, text) from anon;
  end if;
end;
$$;

-- Conferência: deve listar false para todas as funções existentes.
-- select p.proname, has_function_privilege('anon', p.oid, 'execute') as visitante_executa
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('create_order','advance_order','cancel_order','rate_order','check_coupon','coupon_discount');
