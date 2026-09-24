create function set_updated_at() returns trigger
    language plpgsql as
$$
begin
    new.updated_at = now()::timestamptz(0); return new;
end;
$$;

create table users
(
    id                            uuid primary key        default uuidv7(),
    created_at                    timestamptz(0) not null default now()::timestamptz(0),
    updated_at                    timestamptz(0) not null default now()::timestamptz(0),
    email                         text           not null,
    password_hash                 text           not null,
    role                          text           not null default 'user',
    login_at                      timestamptz(0),
    password_changed_at           timestamptz not null default now(),
    suspended_at                  timestamptz(0),
    email_verified_at             timestamptz(0),
    email_verification_token_hash text,
    email_verification_expires_at timestamptz(0),
    trial_ends_at                 timestamptz    not null default now() + interval '30 days',
    name                          text,
    logo                          text, -- public url to logo
    autodiscover_enabled          boolean        not null default true,
    constraint users_email_check_lowercase check (email = lower(email)),
    constraint users_email_check_length check (length(email) between 1 and 254),
    constraint users_password_hash_check_length check (length(password_hash) between 1 and 255),
    constraint users_role_check_value check (role in ('superadmin', 'user')),
    constraint users_name_check_length check (length(trim(name)) between 1 and 80),
    constraint users_logo_check_length check (logo is null or length(logo) between 1 and 200),
    constraint users_email_verification_token_hash_check_pair check ((email_verification_token_hash is null) =
                                                                     (email_verification_expires_at is null)),
    constraint users_email_verification_expires_at_check_after_created_at check (email_verification_expires_at is null or
                                                                                 email_verification_expires_at >
                                                                                 created_at)
);
create unique index users_email_unique on users (lower(email));

create function set_password_changed_at() returns trigger
    language plpgsql as
$$
begin
    new.password_changed_at = now();
    return new;
end;
$$;

create trigger users_set_password_changed_at
    before update of password_hash
    on users
    for each row
    when (old.password_hash is distinct from new.password_hash)
execute function set_password_changed_at();


create table domains
(
    id                 uuid primary key     default uuidv7(),
    created_at         timestamptz not null default now()::timestamptz(0),
    updated_at         timestamptz not null default now()::timestamptz(0),
    user_id            uuid        not null references users (id) on delete cascade,
    domain             text        not null,
    detected_at        timestamptz(0), -- not null only if automatically discovered
    reporting_currency char(3)              default 'USD',
    constraint domains_domain_check_lowercase check (domain = lower(domain)),
    constraint domains_domain_check_length check (length(domain) between 1 and 253),
    constraint domains_reporting_currency_check_format check (reporting_currency is null or reporting_currency ~ '^[A-Z]{3}$')
);
create unique index domains_domain_unique on domains (lower(domain));
create index domains_user_id on domains (user_id);

create table filter_presets
(
    id         uuid primary key     default uuidv7(),
    created_at timestamptz not null default now()::timestamptz(0),
    user_id    uuid        not null references users (id) on delete cascade,
    name       text        not null,
    filters    jsonb       not null,
    constraint filter_presets_name_check_length check (length(trim(name)) between 1 and 100),
    constraint filter_presets_filters_check_object check (jsonb_typeof(filters) = 'object')
);
create index filter_presets_user_id on filter_presets (user_id);

create table shared_dashboards
(
    id           uuid primary key     default uuidv7(),
    created_at   timestamptz not null default now()::timestamptz(0),
    revoked_at   timestamptz(0),
    domain_id    uuid        not null references domains (id) on delete cascade,
    label        text        not null,
    show_revenue boolean     not null default false,
    token_hash   text        not null unique,
    constraint shared_dashboards_label_check_length check (length(trim(label)) between 1 and 100)
);
create index shared_dashboards_domain_id on shared_dashboards (domain_id);

create table scheduled_reports
(
    id           uuid primary key     default uuidv7(),
    created_at   timestamptz not null default now()::timestamptz(0),
    updated_at   timestamptz not null default now()::timestamptz(0),
    domain_id    uuid        not null references domains (id) on delete cascade,
    frequency    text        not null,
    recipients   text[]      not null,
    enabled      boolean     not null default true,
    last_sent_at timestamptz,
    constraint scheduled_reports_frequency_check_value check (frequency in ('daily', 'weekly', 'monthly')),
    constraint scheduled_reports_recipients_check_not_empty check (cardinality(recipients) > 0)
);
create index scheduled_reports_domain_id on scheduled_reports (domain_id);
create index scheduled_reports_enabled on scheduled_reports (id) where enabled;

create table delivered_reports
(
    id           uuid primary key     default uuidv7(),
    created_at   timestamptz not null default now()::timestamptz(0),
    report_id    uuid        not null references scheduled_reports (id) on delete cascade,
    frequency    text        not null,
    period_start timestamptz not null,
    sent_at      timestamptz(0),
    unique (report_id, period_start),
    constraint delivered_reports_frequency_check_value check (frequency in ('daily', 'weekly', 'monthly')),
    constraint delivered_reports_sent_at_check_after_period_start check (sent_at is null or sent_at >= period_start)
);

create table goals
(
    id         uuid primary key     default uuidv7(),
    created_at timestamptz not null default now()::timestamptz(0),
    domain_id  uuid        not null references domains (id) on delete cascade,
    name       text        not null,
    kind       text        not null,
    target     text        not null,
    threshold  integer     not null default 50,
    properties jsonb       not null default '{}',
    unique (domain_id, name),
    constraint goals_kind_check_value check (kind in ('page', 'event', 'scroll')),
    constraint goals_target_check_length check (length(trim(target)) between 1 and 500),
    constraint goals_name_check_length check (length(trim(name)) between 1 and 100),
    constraint goals_threshold_check_range check (threshold between 1 and 100),
    constraint goals_properties_check_object check (jsonb_typeof(properties) = 'object')
);

create table subscriptions
(
    id                     uuid primary key     default uuidv7(),
    created_at             timestamptz not null default now()::timestamptz(0),
    updated_at             timestamptz not null default now()::timestamptz(0),
    user_id                uuid        not null references users (id) on delete restrict,
    plan                   text        not null,
    recurrence             text        not null,
    status                 text        not null,
    stripe_customer_id     text unique,
    stripe_subscription_id text unique,
    cancel_at_period_end   boolean     not null default false,
    current_period_ends_at timestamptz,
    constraint subscriptions_plan_check_value check (plan in ('start', 'grow', 'scale', 'expand')),
    constraint subscriptions_recurrence_check_value check (recurrence in ('month', 'year')),
    constraint subscriptions_status_check_value check (status in
                                                       ('trialing', 'active', 'past_due', 'unpaid', 'canceled',
                                                        'incomplete', 'incomplete_expired')),
    constraint subscriptions_stripe_customer_id_check_length check (stripe_customer_id is null or
                                                                    length(stripe_customer_id) between 1 and 255),
    constraint subscriptions_stripe_subscription_id_check_length check (stripe_subscription_id is null or
                                                                        length(stripe_subscription_id) between 1 and 255)
);
create index subscriptions_user_id on subscriptions (user_id);

create table billing_users
(
    user_id                uuid primary key references users (id) on delete restrict,
    archived_at            timestamptz(0),
    stripe_customer_id     text unique,
    stripe_subscription_id text unique,
    constraint billing_users_stripe_customer_id_check_length check (stripe_customer_id is null or
                                                                    length(stripe_customer_id) between 1 and 255),
    constraint billing_users_stripe_subscription_id_check_length check (stripe_subscription_id is null or
                                                                        length(stripe_subscription_id) between 1 and 255)
);

create table payments
(
    id                 uuid primary key     default uuidv7(),
    created_at         timestamptz not null default now()::timestamptz(0),
    updated_at         timestamptz not null default now()::timestamptz(0),
    user_id            uuid        references users (id) on delete set null,
    billing_user_id    uuid        references billing_users (user_id) on delete set null,
    amount             integer     not null,
    currency           char(3)     not null,
    status             text        not null default 'pending',
    provider           text,
    provider_reference text,
    invoice_url        text,
    unique (provider, provider_reference),
    constraint payments_amount_check_positive check (amount > 0),
    constraint payments_currency_check_format check (currency ~ '^[A-Z]{3}$'),
    constraint payments_status_check_value check (status in ('pending', 'paid', 'failed', 'refunded')),
    constraint payments_provider_check_pair check ((provider is null) = (provider_reference is null)),
    constraint payments_provider_check_length check (provider is null or length(trim(provider)) between 1 and 50),
    constraint payments_provider_reference_check_length check (provider_reference is null or
                                                               length(trim(provider_reference)) between 1 and 255),
    constraint payments_invoice_url_check_length check (invoice_url is null or length(invoice_url) between 1 and 2000)
);
create index payments_user_id on payments (user_id);
create index payments_billing_user_id on payments (billing_user_id);

create table checkout_attempts
(
    id                uuid primary key     default uuidv7(),
    created_at        timestamptz not null default now()::timestamptz(0),
    updated_at        timestamptz not null default now()::timestamptz(0),
    user_id           uuid        not null references users (id) on delete cascade,
    plan              text        not null,
    recurrence        text        not null,
    stripe_session_id text unique,
    url               text,
    expires_at        timestamptz(0),
    completed_at      timestamptz(0),
    constraint checkout_attempts_plan_check_value check (plan in ('start', 'grow', 'scale', 'expand')),
    constraint checkout_attempts_recurrence_check_value check (recurrence in ('month', 'year')),
    constraint checkout_attempts_stripe_session_id_check_length check (stripe_session_id is null or length(stripe_session_id) between 1 and 255),
    constraint checkout_attempts_url_check_length check (url is null or length(url) between 1 and 2000),
    constraint checkout_attempts_expires_at_check_after_created_at check (expires_at is null or expires_at > created_at)
);
create unique index checkout_attempts_open_user on checkout_attempts (user_id) where completed_at is null;

create table stripe_events
(
    id         text primary key,
    created_at timestamptz not null default now()::timestamptz(0),
    constraint stripe_events_id_check_length check (length(id) between 1 and 255)
);

create table plans
(
    id            uuid primary key        default uuidv7(),
    created_at    timestamptz    not null default now()::timestamptz(0),
    name          text           not null,
    monthly_price numeric(12, 2) not null,
    yearly_price  numeric(12, 2) not null,
    valid_from    timestamptz    not null,
    unique (name, valid_from),
    constraint plans_name_check_value check (name in ('start', 'grow', 'scale', 'expand')),
    constraint plans_monthly_price_check_positive check (monthly_price > 0),
    constraint plans_yearly_price_check_positive check (yearly_price > 0)
);

create table superadmin_audit_logs
(
    id         uuid primary key     default uuidv7(),
    created_at timestamptz not null default now()::timestamptz(0),
    ip_address text        not null,
    action     text        not null,
    user_id    uuid        references users (id) on delete set null,
    domain_id  uuid        references domains (id) on delete set null,
    constraint superadmin_audit_logs_ip_address_check_length check (length(ip_address) between 1 and 45),
    constraint superadmin_audit_logs_action_check_length check (length(trim(action)) between 1 and 255)
);
create index superadmin_audit_logs_user_id on superadmin_audit_logs (user_id);
create index superadmin_audit_logs_domain_id on superadmin_audit_logs (domain_id);

create trigger users_set_updated_at
    before update
    on users
    for each row
execute function set_updated_at();

create trigger domains_set_updated_at
    before update
    on domains
    for each row
execute function set_updated_at();
create trigger scheduled_reports_set_updated_at
    before update
    on scheduled_reports
    for each row
execute function set_updated_at();
create trigger subscriptions_set_updated_at
    before update
    on subscriptions
    for each row
execute function set_updated_at();
create trigger payments_set_updated_at
    before update
    on payments
    for each row
execute function set_updated_at();
create trigger checkout_attempts_set_updated_at
    before update
    on checkout_attempts
    for each row
execute function set_updated_at();
