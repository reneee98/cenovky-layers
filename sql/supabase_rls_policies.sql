-- Supabase Row Level Security policies (owner-only access)

begin;

-- Revoke direct access for anon and allow authenticated only under RLS.
revoke all on table public.settings from anon;
revoke all on table public.clients from anon;
revoke all on table public.catalog_items from anon;
revoke all on table public.snippets from anon;
revoke all on table public.quotes from anon;
revoke all on table public.quote_items from anon;
revoke all on table public.scope_items from anon;
revoke all on table public.quote_versions from anon;
revoke all on table public.invoices from anon;
revoke all on table public.invoice_items from anon;
revoke all on table public.payments from anon;

grant select, insert, update, delete on table public.settings to authenticated;
grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.catalog_items to authenticated;
grant select, insert, update, delete on table public.snippets to authenticated;
grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.quote_items to authenticated;
grant select, insert, update, delete on table public.scope_items to authenticated;
grant select, insert, update, delete on table public.quote_versions to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.invoice_items to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;

alter table public.settings enable row level security;
alter table public.clients enable row level security;
alter table public.catalog_items enable row level security;
alter table public.snippets enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.scope_items enable row level security;
alter table public.quote_versions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

alter table public.settings force row level security;
alter table public.clients force row level security;
alter table public.catalog_items force row level security;
alter table public.snippets force row level security;
alter table public.quotes force row level security;
alter table public.quote_items force row level security;
alter table public.scope_items force row level security;
alter table public.quote_versions force row level security;
alter table public.invoices force row level security;
alter table public.invoice_items force row level security;
alter table public.payments force row level security;

-- Settings

drop policy if exists settings_select_own on public.settings;
drop policy if exists settings_insert_own on public.settings;
drop policy if exists settings_update_own on public.settings;
drop policy if exists settings_delete_own on public.settings;

create policy settings_select_own on public.settings
  for select using (auth.uid()::text = user_id);

create policy settings_insert_own on public.settings
  for insert with check (auth.uid()::text = user_id);

create policy settings_update_own on public.settings
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy settings_delete_own on public.settings
  for delete using (auth.uid()::text = user_id);

-- Clients

drop policy if exists clients_select_own on public.clients;
drop policy if exists clients_insert_own on public.clients;
drop policy if exists clients_update_own on public.clients;
drop policy if exists clients_delete_own on public.clients;

create policy clients_select_own on public.clients
  for select using (auth.uid()::text = user_id);

create policy clients_insert_own on public.clients
  for insert with check (auth.uid()::text = user_id);

create policy clients_update_own on public.clients
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy clients_delete_own on public.clients
  for delete using (auth.uid()::text = user_id);

-- Catalog

drop policy if exists catalog_items_select_own on public.catalog_items;
drop policy if exists catalog_items_insert_own on public.catalog_items;
drop policy if exists catalog_items_update_own on public.catalog_items;
drop policy if exists catalog_items_delete_own on public.catalog_items;

create policy catalog_items_select_own on public.catalog_items
  for select using (auth.uid()::text = user_id);

create policy catalog_items_insert_own on public.catalog_items
  for insert with check (auth.uid()::text = user_id);

create policy catalog_items_update_own on public.catalog_items
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy catalog_items_delete_own on public.catalog_items
  for delete using (auth.uid()::text = user_id);

-- Snippets

drop policy if exists snippets_select_own on public.snippets;
drop policy if exists snippets_insert_own on public.snippets;
drop policy if exists snippets_update_own on public.snippets;
drop policy if exists snippets_delete_own on public.snippets;

create policy snippets_select_own on public.snippets
  for select using (auth.uid()::text = user_id);

create policy snippets_insert_own on public.snippets
  for insert with check (auth.uid()::text = user_id);

create policy snippets_update_own on public.snippets
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy snippets_delete_own on public.snippets
  for delete using (auth.uid()::text = user_id);

-- Quotes

drop policy if exists quotes_select_own on public.quotes;
drop policy if exists quotes_insert_own on public.quotes;
drop policy if exists quotes_update_own on public.quotes;
drop policy if exists quotes_delete_own on public.quotes;

create policy quotes_select_own on public.quotes
  for select using (auth.uid()::text = user_id);

create policy quotes_insert_own on public.quotes
  for insert with check (auth.uid()::text = user_id);

create policy quotes_update_own on public.quotes
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy quotes_delete_own on public.quotes
  for delete using (auth.uid()::text = user_id);

-- Quote items

drop policy if exists quote_items_select_own on public.quote_items;
drop policy if exists quote_items_insert_own on public.quote_items;
drop policy if exists quote_items_update_own on public.quote_items;
drop policy if exists quote_items_delete_own on public.quote_items;

create policy quote_items_select_own on public.quote_items
  for select using (auth.uid()::text = user_id);

create policy quote_items_insert_own on public.quote_items
  for insert with check (auth.uid()::text = user_id);

create policy quote_items_update_own on public.quote_items
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy quote_items_delete_own on public.quote_items
  for delete using (auth.uid()::text = user_id);

-- Scope items

drop policy if exists scope_items_select_own on public.scope_items;
drop policy if exists scope_items_insert_own on public.scope_items;
drop policy if exists scope_items_update_own on public.scope_items;
drop policy if exists scope_items_delete_own on public.scope_items;

create policy scope_items_select_own on public.scope_items
  for select using (auth.uid()::text = user_id);

create policy scope_items_insert_own on public.scope_items
  for insert with check (auth.uid()::text = user_id);

create policy scope_items_update_own on public.scope_items
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy scope_items_delete_own on public.scope_items
  for delete using (auth.uid()::text = user_id);

-- Quote versions

drop policy if exists quote_versions_select_own on public.quote_versions;
drop policy if exists quote_versions_insert_own on public.quote_versions;
drop policy if exists quote_versions_update_own on public.quote_versions;
drop policy if exists quote_versions_delete_own on public.quote_versions;

create policy quote_versions_select_own on public.quote_versions
  for select using (auth.uid()::text = user_id);

create policy quote_versions_insert_own on public.quote_versions
  for insert with check (auth.uid()::text = user_id);

create policy quote_versions_update_own on public.quote_versions
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy quote_versions_delete_own on public.quote_versions
  for delete using (auth.uid()::text = user_id);

-- Invoices

drop policy if exists invoices_select_own on public.invoices;
drop policy if exists invoices_insert_own on public.invoices;
drop policy if exists invoices_update_own on public.invoices;
drop policy if exists invoices_delete_own on public.invoices;

create policy invoices_select_own on public.invoices
  for select using (auth.uid()::text = user_id);

create policy invoices_insert_own on public.invoices
  for insert with check (auth.uid()::text = user_id);

create policy invoices_update_own on public.invoices
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy invoices_delete_own on public.invoices
  for delete using (auth.uid()::text = user_id);

-- Invoice items

drop policy if exists invoice_items_select_own on public.invoice_items;
drop policy if exists invoice_items_insert_own on public.invoice_items;
drop policy if exists invoice_items_update_own on public.invoice_items;
drop policy if exists invoice_items_delete_own on public.invoice_items;

create policy invoice_items_select_own on public.invoice_items
  for select using (auth.uid()::text = user_id);

create policy invoice_items_insert_own on public.invoice_items
  for insert with check (auth.uid()::text = user_id);

create policy invoice_items_update_own on public.invoice_items
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy invoice_items_delete_own on public.invoice_items
  for delete using (auth.uid()::text = user_id);

-- Payments

drop policy if exists payments_select_own on public.payments;
drop policy if exists payments_insert_own on public.payments;
drop policy if exists payments_update_own on public.payments;
drop policy if exists payments_delete_own on public.payments;

create policy payments_select_own on public.payments
  for select using (auth.uid()::text = user_id);

create policy payments_insert_own on public.payments
  for insert with check (auth.uid()::text = user_id);

create policy payments_update_own on public.payments
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy payments_delete_own on public.payments
  for delete using (auth.uid()::text = user_id);

commit;
