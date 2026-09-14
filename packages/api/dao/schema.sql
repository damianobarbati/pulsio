create table if not exists accounts
(
    id                            uuid primary key,
    created_at                    timestamptz default now()::timestamptz(0) not null,
    updated_at                    timestamptz default now()::timestamptz(0) not null,
    email                         text unique                               not null,
    password_hash                 text                                      not null,
    suspended_at                  timestamptz,
    last_login_at                 timestamptz,
    email_verified_at             timestamptz,
    email_verification_token_hash text,
    email_verification_expires_at timestamptz,
    trial_ends_at                 timestamptz                               not null default now() + interval '30 days'
);

create table if not exists sites
(
    id          uuid primary key,
    created_at  timestamptz default now()::timestamptz(0) not null,
    updated_at  timestamptz default now()::timestamptz(0) not null,
    account_id  uuid                                      not null references accounts (id) on delete cascade,
    domain      varchar(253) unique                       not null,
    detected_at timestamptz
);
create index if not exists sites_account_id on sites (account_id);

create table if not exists goals
(
    id         uuid primary key,
    site_id    uuid         not null references sites (id) on delete cascade,
    name       varchar(100) not null,
    kind       varchar(10)  not null check (kind in ('page', 'event', 'scroll')),
    target     varchar(500) not null,
    threshold  integer      not null default 50 check (threshold between 1 and 100),
    properties jsonb        not null default '{}',
    unique (site_id, name)
);
create index if not exists goals_site_id on goals (site_id);

create table if not exists sessions
(
    token_hash text primary key,
    account_id uuid        not null references accounts (id) on delete cascade,
    expires_at timestamptz not null
);
create index if not exists sessions_account_id on sessions (account_id);

create table if not exists subscriptions
(
    id                     uuid primary key,
    created_at             timestamptz default now()::timestamptz(0) not null,
    updated_at             timestamptz default now()::timestamptz(0) not null,
    account_id             uuid                                      not null unique references accounts (id) on delete cascade,
    plan                   text                                      not null,
    interval               text                                      not null,
    status                 text                                      not null,
    stripe_customer_id     text unique,
    stripe_subscription_id text unique,
    cancel_at_period_end   boolean                                   not null default false,
    current_period_ends_at timestamptz
);

create table if not exists payments
(
    id                 uuid primary key,
    created_at         timestamptz default now()::timestamptz(0) not null,
    updated_at         timestamptz default now()::timestamptz(0) not null,
    account_id         uuid                                      not null references accounts (id),
    amount             integer                                   not null check (amount > 0),
    currency           varchar(3)                                not null check (currency ~ '^[A-Z]{3}$'),
    status             text                                      not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
    provider           text,
    provider_reference text,
    invoice_url        text,
    unique (provider, provider_reference)
);
create index if not exists payments_account_id on payments (account_id);

create table if not exists superadmin_audit_logs
(
    id         uuid primary key,
    created_at timestamptz default now()::timestamptz(0) not null,
    ip_address text                                      not null,
    action     text                                      not null,
    account_id uuid                                      references accounts (id) on delete set null,
    site_id    uuid                                      references sites (id) on delete set null
);
create index if not exists superadmin_audit_logs_account_id on superadmin_audit_logs (account_id)
