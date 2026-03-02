-- Supabase invoices module migration
-- Adds invoice entities + client billing profile fields + quote invoicing state.

begin;

-- Client billing profile extension
alter table public.clients add column if not exists company_name text;
alter table public.clients add column if not exists first_name text;
alter table public.clients add column if not exists last_name text;
alter table public.clients add column if not exists billing_street text;
alter table public.clients add column if not exists billing_city text;
alter table public.clients add column if not exists billing_zip text;
alter table public.clients add column if not exists billing_country text;
alter table public.clients add column if not exists ic_dph text;
alter table public.clients add column if not exists vat_payer boolean not null default false;
alter table public.clients add column if not exists tax_regime_default text;
alter table public.clients add column if not exists default_currency text;
alter table public.clients add column if not exists default_due_days integer;
alter table public.clients add column if not exists default_payment_method text;
alter table public.clients add column if not exists notes text;

update public.clients
set
  company_name = coalesce(company_name, case when type = 'company' then name else null end),
  first_name = coalesce(first_name, case when type = 'person' then name else null end),
  billing_street = coalesce(billing_street, billing_address_line1),
  billing_city = coalesce(billing_city, city),
  billing_zip = coalesce(billing_zip, zip),
  billing_country = coalesce(billing_country, country),
  ic_dph = coalesce(ic_dph, icdph);

-- Quote invoicing state
alter table public.quotes add column if not exists invoicing_state text not null default 'not_invoiced';

update public.quotes
set invoicing_state = case
  when status = 'invoiced' then 'fully_invoiced'
  else coalesce(invoicing_state, 'not_invoiced')
end;

create index if not exists quotes_user_id_invoicing_state_idx on public.quotes(user_id, invoicing_state);

-- Invoices
create table if not exists public.invoices (
  id text primary key,
  user_id text not null,
  quote_id text,
  client_id text not null,
  invoice_number text not null,
  variable_symbol text,
  issue_date timestamptz not null,
  taxable_supply_date timestamptz not null,
  due_date timestamptz not null,
  payment_method text not null,
  currency text not null,
  vat_enabled boolean not null default true,
  vat_rate numeric not null,
  tax_regime text,
  invoice_kind text not null default 'full',
  supplier_snapshot_json jsonb not null,
  client_snapshot_json jsonb not null,
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  tax_base_total numeric not null default 0,
  vat_total numeric not null default 0,
  total numeric not null default 0,
  amount_paid numeric not null default 0,
  amount_due numeric not null default 0,
  status text not null default 'draft',
  legal_note text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_client_id_user_id_fkey
    foreign key (client_id, user_id)
    references public.clients(id, user_id)
    on delete restrict
    on update cascade,
  constraint invoices_quote_id_user_id_fkey
    foreign key (quote_id, user_id)
    references public.quotes(id, user_id)
    on delete set null
    on update cascade
);

create unique index if not exists invoices_id_user_id_key on public.invoices(id, user_id);
create unique index if not exists invoices_user_id_invoice_number_key on public.invoices(user_id, invoice_number);
create index if not exists invoices_user_id_status_idx on public.invoices(user_id, status);
create index if not exists invoices_user_id_quote_id_idx on public.invoices(user_id, quote_id);
create index if not exists invoices_user_id_client_id_idx on public.invoices(user_id, client_id);
create index if not exists invoices_user_id_issue_date_idx on public.invoices(user_id, issue_date);
create index if not exists invoices_user_id_due_date_idx on public.invoices(user_id, due_date);

-- Invoice items
create table if not exists public.invoice_items (
  id text primary key,
  user_id text not null,
  invoice_id text not null,
  name text not null,
  description text,
  unit text not null,
  qty numeric not null,
  unit_price numeric not null,
  discount_pct numeric not null default 0,
  vat_rate numeric not null,
  line_subtotal numeric not null default 0,
  line_vat numeric not null default 0,
  line_total numeric not null default 0,
  sort_order integer not null,
  constraint invoice_items_invoice_id_user_id_fkey
    foreign key (invoice_id, user_id)
    references public.invoices(id, user_id)
    on delete cascade
    on update cascade
);

create unique index if not exists invoice_items_id_user_id_key on public.invoice_items(id, user_id);
create index if not exists invoice_items_user_id_invoice_id_sort_order_idx on public.invoice_items(user_id, invoice_id, sort_order);

-- Payments
create table if not exists public.payments (
  id text primary key,
  user_id text not null,
  invoice_id text not null,
  payment_date timestamptz not null,
  amount numeric not null,
  method text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint payments_invoice_id_user_id_fkey
    foreign key (invoice_id, user_id)
    references public.invoices(id, user_id)
    on delete cascade
    on update cascade
);

create unique index if not exists payments_id_user_id_key on public.payments(id, user_id);
create index if not exists payments_user_id_invoice_id_payment_date_idx on public.payments(user_id, invoice_id, payment_date);

commit;
