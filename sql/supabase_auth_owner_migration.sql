-- Supabase owner migration
-- Purpose:
-- 1) add user_id to app tables
-- 2) backfill existing rows to first auth user (legacy single-user data)
-- 3) enforce owner constraints and scoped uniqueness

begin;

-- 1) Add user_id columns.
alter table public.settings add column if not exists user_id text;
alter table public.clients add column if not exists user_id text;
alter table public.catalog_items add column if not exists user_id text;
alter table public.snippets add column if not exists user_id text;
alter table public.quotes add column if not exists user_id text;
alter table public.quote_items add column if not exists user_id text;
alter table public.scope_items add column if not exists user_id text;
alter table public.quote_versions add column if not exists user_id text;

-- 2) Backfill legacy rows to first auth user.
do $$
declare
  owner_id text;
begin
  select id::text into owner_id
  from auth.users
  order by created_at asc
  limit 1;

  if owner_id is null then
    raise exception 'No auth.users row found. Create at least one user before running migration.';
  end if;

  update public.settings set user_id = owner_id where user_id is null;
  update public.clients set user_id = owner_id where user_id is null;
  update public.catalog_items set user_id = owner_id where user_id is null;
  update public.snippets set user_id = owner_id where user_id is null;
  update public.quotes set user_id = owner_id where user_id is null;

  update public.quote_items qi
  set user_id = q.user_id
  from public.quotes q
  where qi.quote_id = q.id
    and qi.user_id is null;

  update public.scope_items si
  set user_id = q.user_id
  from public.quotes q
  where si.quote_id = q.id
    and si.user_id is null;

  update public.quote_versions qv
  set user_id = q.user_id
  from public.quotes q
  where qv.quote_id = q.id
    and qv.user_id is null;
end $$;

-- 3) Set owner columns to NOT NULL.
alter table public.settings alter column user_id set not null;
alter table public.clients alter column user_id set not null;
alter table public.catalog_items alter column user_id set not null;
alter table public.snippets alter column user_id set not null;
alter table public.quotes alter column user_id set not null;
alter table public.quote_items alter column user_id set not null;
alter table public.scope_items alter column user_id set not null;
alter table public.quote_versions alter column user_id set not null;

-- 4) Replace global quote number uniqueness with per-user uniqueness.
drop index if exists public.quotes_number_key;
create unique index if not exists quotes_user_id_number_key on public.quotes(user_id, number);

-- 5) Add owner-scoped unique keys used by Prisma composite lookups.
create unique index if not exists clients_id_user_id_key on public.clients(id, user_id);
create unique index if not exists catalog_items_id_user_id_key on public.catalog_items(id, user_id);
create unique index if not exists snippets_id_user_id_key on public.snippets(id, user_id);
create unique index if not exists quotes_id_user_id_key on public.quotes(id, user_id);
create unique index if not exists quote_items_id_user_id_key on public.quote_items(id, user_id);
create unique index if not exists scope_items_id_user_id_key on public.scope_items(id, user_id);
create unique index if not exists quote_versions_id_user_id_key on public.quote_versions(id, user_id);
create unique index if not exists quote_versions_user_id_quote_id_version_number_key
  on public.quote_versions(user_id, quote_id, version_number);

-- 6) Replace foreign keys with owner-scoped foreign keys.
alter table public.quotes drop constraint if exists quotes_client_id_fkey;
alter table public.quotes
  add constraint quotes_client_id_user_id_fkey
  foreign key (client_id, user_id)
  references public.clients(id, user_id)
  on delete restrict
  on update cascade;

alter table public.quote_items drop constraint if exists quote_items_quote_id_fkey;
alter table public.quote_items
  add constraint quote_items_quote_id_user_id_fkey
  foreign key (quote_id, user_id)
  references public.quotes(id, user_id)
  on delete cascade
  on update cascade;

alter table public.scope_items drop constraint if exists scope_items_quote_id_fkey;
alter table public.scope_items
  add constraint scope_items_quote_id_user_id_fkey
  foreign key (quote_id, user_id)
  references public.quotes(id, user_id)
  on delete cascade
  on update cascade;

alter table public.quote_versions drop constraint if exists quote_versions_quote_id_fkey;
alter table public.quote_versions
  add constraint quote_versions_quote_id_user_id_fkey
  foreign key (quote_id, user_id)
  references public.quotes(id, user_id)
  on delete cascade
  on update cascade;

-- 7) Add owner indexes.
create index if not exists settings_user_id_idx on public.settings(user_id);
create index if not exists clients_user_id_name_idx on public.clients(user_id, name);
create index if not exists catalog_items_user_id_category_idx on public.catalog_items(user_id, category);
create index if not exists catalog_items_user_id_name_idx on public.catalog_items(user_id, name);
create index if not exists snippets_user_id_type_language_idx on public.snippets(user_id, type, language);
create index if not exists quotes_user_id_status_idx on public.quotes(user_id, status);
create index if not exists quotes_user_id_client_id_idx on public.quotes(user_id, client_id);
create index if not exists quotes_user_id_currency_idx on public.quotes(user_id, currency);
create index if not exists quotes_user_id_created_at_idx on public.quotes(user_id, created_at);
create index if not exists quote_items_user_id_quote_id_sort_order_idx on public.quote_items(user_id, quote_id, sort_order);
create index if not exists scope_items_user_id_quote_id_category_idx on public.scope_items(user_id, quote_id, category);
create index if not exists scope_items_user_id_quote_id_sort_order_idx on public.scope_items(user_id, quote_id, sort_order);
create index if not exists quote_versions_user_id_quote_id_idx on public.quote_versions(user_id, quote_id);

commit;
