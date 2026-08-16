create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  bot_link_code text not null unique,
  bot_linked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.new_bot_link_code()
returns text
language plpgsql
volatile
as $$
declare
  candidate text;
begin
  loop
    candidate := 'DYR-' || upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1 from public.profiles where bot_link_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, bot_link_code)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    public.new_bot_link_code()
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_mint text not null,
  token_symbol text,
  token_name text,
  current_market_cap numeric,
  market_cap_at_watch numeric,
  price_at_watch numeric,
  alert_enabled boolean not null default true,
  alert_up_percent numeric not null default 50,
  alert_down_percent numeric not null default 20,
  is_active boolean not null default true,
  last_checked_mc numeric,
  last_checked_at timestamptz,
  last_alert_type text,
  last_alert_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watchlists_user_token_unique unique (user_id, token_mint),
  constraint watchlists_alert_up_nonnegative check (alert_up_percent >= 0),
  constraint watchlists_alert_down_nonnegative check (alert_down_percent >= 0)
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  sol_balance numeric,
  total_value_usd numeric,
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now()
);

create table if not exists public.user_wallets (
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  first_analyzed_at timestamptz not null default now(),
  last_analyzed_at timestamptz not null default now(),
  primary key (user_id, wallet_id)
);

create table if not exists public.wallet_holdings (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  token_mint text not null,
  token_symbol text,
  token_name text,
  balance numeric,
  value_usd numeric,
  decimals integer,
  logo_url text,
  updated_at timestamptz not null default now(),
  unique (wallet_id, token_mint)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  signature text not null,
  transaction_type text,
  description text,
  occurred_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  unique (wallet_id, signature)
);

create table if not exists public.wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  signature text not null,
  token_mint text,
  direction text,
  amount numeric,
  counterparty text,
  occurred_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  unique (wallet_id, signature, direction, token_mint)
);

create table if not exists public.wallet_token_positions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  token_mint text not null,
  current_balance numeric,
  current_value_usd numeric,
  position_status text not null default 'unknown',
  updated_at timestamptz not null default now(),
  unique (wallet_id, token_mint)
);

create table if not exists public.wallet_pnl (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  token_mint text,
  realized_pnl_usd numeric,
  unrealized_pnl_usd numeric,
  total_pnl_usd numeric,
  source text,
  as_of timestamptz not null default now(),
  unique (wallet_id, token_mint)
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists watchlists_touch_updated_at on public.watchlists;
create trigger watchlists_touch_updated_at before update on public.watchlists
for each row execute procedure public.touch_updated_at();

create index if not exists watchlists_active_idx
  on public.watchlists (is_active, user_id);
create index if not exists user_wallets_user_idx
  on public.user_wallets (user_id);
create index if not exists wallet_transactions_wallet_time_idx
  on public.wallet_transactions (wallet_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.wallets enable row level security;
alter table public.user_wallets enable row level security;
alter table public.wallet_holdings enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_transfers enable row level security;
alter table public.wallet_token_positions enable row level security;
alter table public.wallet_pnl enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles
for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "watchlists own rows" on public.watchlists;
create policy "watchlists own rows" on public.watchlists
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user wallets own rows" on public.user_wallets;
create policy "user wallets own rows" on public.user_wallets
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "wallet identities for analyzed rows" on public.wallets;
create policy "wallet identities for analyzed rows" on public.wallets
for select using (auth.uid() is not null);

drop policy if exists "wallet identities can be created" on public.wallets;
create policy "wallet identities can be created" on public.wallets
for insert with check (auth.uid() is not null);

drop policy if exists "wallet identities can be refreshed" on public.wallets;
create policy "wallet identities can be refreshed" on public.wallets
for update using (auth.uid() is not null) with check (auth.uid() is not null);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wallet_holdings',
    'wallet_transactions',
    'wallet_transfers',
    'wallet_token_positions',
    'wallet_pnl'
  ] loop
    execute format('drop policy if exists "%s own rows" on public.%I', table_name, table_name);
    execute format(
      'create policy "%s own rows" on public.%I for all using (
        exists (
          select 1 from public.user_wallets uw
          where uw.wallet_id = %I.wallet_id and uw.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.user_wallets uw
          where uw.wallet_id = %I.wallet_id and uw.user_id = auth.uid()
        )
      )',
      table_name, table_name, table_name, table_name
    );
  end loop;
end $$;

create or replace view public.bot_watchlist_read_model
with (security_invoker = true)
as
select
  w.id as watchlist_id,
  w.user_id,
  p.bot_link_code,
  w.token_mint,
  w.token_symbol,
  w.token_name,
  w.market_cap_at_watch,
  w.current_market_cap,
  w.price_at_watch,
  w.alert_enabled,
  w.alert_up_percent,
  w.alert_down_percent,
  w.is_active,
  w.last_checked_mc,
  w.last_checked_at,
  w.last_alert_type,
  w.last_alert_at
from public.watchlists w
join public.profiles p on p.id = w.user_id
where w.is_active = true;