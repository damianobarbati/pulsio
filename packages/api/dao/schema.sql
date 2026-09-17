do $$
begin
    if exists (select 1 from pg_class where oid = to_regclass('accounts') and relkind = 'r') then
        drop table if exists superadmin_audit_logs cascade;
        drop table if exists payments cascade;
        drop table if exists subscriptions cascade;
        drop table if exists sessions cascade;
        drop table if exists goals cascade;
        drop table if exists sites cascade;
        drop table accounts cascade;
    elsif exists (select 1 from pg_class where oid = to_regclass('accounts') and relkind in ('v', 'm')) then
        drop view accounts cascade;
    end if;
end $$;

create table if not exists users
(
    id                            uuid primary key default uuidv7(),
    created_at                    timestamptz default now()::timestamptz(0) not null,
    updated_at                    timestamptz default now()::timestamptz(0) not null,
    email                         text unique not null,
    password_hash                 text not null,
    suspended_at                  timestamptz,
    last_login_at                 timestamptz,
    email_verified_at             timestamptz,
    email_verification_token_hash text,
    email_verification_expires_at timestamptz,
    trial_ends_at                 timestamptz not null default now() + interval '30 days'
);

create or replace view accounts as select * from users;

create table if not exists sites
(
    id          uuid primary key default uuidv7(),
    created_at  timestamptz default now()::timestamptz(0) not null,
    updated_at  timestamptz default now()::timestamptz(0) not null,
    user_id     uuid not null references users (id) on delete cascade,
    account_id  uuid generated always as (user_id) stored,
    domain                     varchar(253) unique not null,
    detected_at                timestamptz,
    automatically_discovered   boolean not null default false
);
create index if not exists sites_user_id on sites (user_id);

create table if not exists goals
(
    id         uuid primary key default uuidv7(),
    created_at timestamptz default now()::timestamptz(0) not null,
    site_id    uuid not null references sites (id) on delete cascade,
    name       varchar(100) not null,
    kind       varchar(10) not null check (kind in ('page', 'event', 'scroll')),
    target     varchar(500) not null,
    threshold  integer not null default 50 check (threshold between 1 and 100),
    properties jsonb not null default '{}',
    unique (site_id, name)
);
create index if not exists goals_site_id on goals (site_id);

create table if not exists sessions
(
    token_hash text primary key,
    account_id uuid not null references users (id) on delete cascade,
    expires_at timestamptz not null
);
create index if not exists sessions_account_id on sessions (account_id);

create table if not exists subscriptions
(
    id                     uuid primary key default uuidv7(),
    created_at             timestamptz default now()::timestamptz(0) not null,
    updated_at             timestamptz default now()::timestamptz(0) not null,
    account_id             uuid not null unique references users (id) on delete cascade,
    plan                   text not null,
    interval               text not null,
    status                 text not null,
    stripe_customer_id     text unique,
    stripe_subscription_id text unique,
    cancel_at_period_end   boolean not null default false,
    current_period_ends_at timestamptz
);

create table if not exists payments
(
    id                 uuid primary key default uuidv7(),
    created_at         timestamptz default now()::timestamptz(0) not null,
    updated_at         timestamptz default now()::timestamptz(0) not null,
    account_id         uuid references users (id) on delete set null,
    amount             integer not null check (amount > 0),
    currency           varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
    status             text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
    provider           text,
    provider_reference text,
    invoice_url        text,
    unique (provider, provider_reference)
);
create index if not exists payments_account_id on payments (account_id);

create table if not exists plans
(
    id            uuid primary key default uuidv7(),
    created_at    timestamptz default now()::timestamptz(0) not null,
    name          text not null check (name in ('start', 'grow', 'scale', 'expand')),
    monthly_price numeric not null,
    yearly_price  numeric not null,
    valid_from    timestamptz not null,
    unique (name, valid_from)
);

create table if not exists superadmin_audit_logs
(
    id         uuid primary key default uuidv7(),
    created_at timestamptz default now()::timestamptz(0) not null,
    ip_address text not null,
    action     text not null,
    account_id uuid references users (id) on delete set null,
    site_id    uuid references sites (id) on delete set null
);
create index if not exists superadmin_audit_logs_account_id on superadmin_audit_logs (account_id);
