-- ============================================================================
-- 010_karma_balance_unique_fix.sql
--
-- Применять ТОЛЬКО если check_transfer.sql показал "ок = false" для
-- строки "karma_balance: уникальность user_id" — то есть только если
-- диагностика подтвердила именно эту причину 500-й ошибки при переводе.
--
-- migrations/001_transfer_karma.sql делает "on conflict (user_id) do
-- update" в karma_balance — для этого обязателен уникальный
-- индекс/constraint на user_id. Если его никогда не было, Postgres
-- бросает исключение прямо на этом месте, и наружу это выглядит как
-- голый 500 без понятного сообщения.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'karma_balance'
      and indexdef ilike '%unique%' and indexdef ilike '%user_id%'
  ) then
    alter table public.karma_balance add constraint karma_balance_user_id_key unique (user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
