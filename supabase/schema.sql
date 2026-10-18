-- Grochu Privates — schemat bazy. Wklej w Supabase: SQL Editor → New query → Run.
-- Każdy wiersz ma właściciela; Row Level Security wpuszcza wyłącznie jego.

create table if not exists public.app_state (
  user_id    uuid   not null default auth.uid() references auth.users on delete cascade,
  key        text   not null,
  value      jsonb  not null,
  updated_at bigint not null,          -- ms od 1970, do rozstrzygania, która wersja jest nowsza
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

drop policy if exists "Tylko właściciel" on public.app_state;
create policy "Tylko właściciel" on public.app_state
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- anonimowy klucz (publiczny) nie ma żadnego dostępu
revoke all on public.app_state from anon;

-- Zapis tylko wtedy, gdy wersja jest nowsza niż ta w bazie (telefon vs komputer).
create or replace function public.put_state(p_key text, p_value jsonb, p_updated_at bigint)
returns boolean
language sql
security invoker
set search_path = public
as $$
  with up as (
    insert into public.app_state (user_id, key, value, updated_at)
    values (auth.uid(), p_key, p_value, p_updated_at)
    on conflict (user_id, key) do update
      set value = excluded.value, updated_at = excluded.updated_at
      where public.app_state.updated_at <= excluded.updated_at
    returning 1
  )
  select exists (select 1 from up);
$$;

revoke all on function public.put_state(text, jsonb, bigint) from anon, public;
grant execute on function public.put_state(text, jsonb, bigint) to authenticated;
