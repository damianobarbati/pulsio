create function set_updated_at () returns trigger language plpgsql as $$
begin
  new.updated_at = now()::timestamptz(0);
  return new;
end;
$$;

create table users (
  id uuid primary key default uuidv7(),
  created_at timestamptz(0) not null default now()::timestamptz(0),
  updated_at timestamptz(0) not null default now()::timestamptz(0),
  email text not null,
  password_hash text not null,
  role text not null check (role in ('user', 'superadmin')) default 'user',
  login_at timestamptz(0),
  password_changed_at timestamptz not null default now(),
  suspended_at timestamptz(0),
  email_verified_at timestamptz(0),
  email_verification_token_hash text,
  email_verification_expires_at timestamptz(0),
  trial_ends_at timestamptz not null default now()+interval '30 days',
  stripe_customer_id text unique,
  deleted_at timestamptz(0),
  name text,
  primary_color text,
  autodiscover_enabled boolean not null default true
);

alter table users
add constraint users_email_verification_token_hash_check_pair check (
  (email_verification_token_hash is null)=(email_verification_expires_at is null)
);

alter table users
add constraint users_email_verification_expires_at_check_after_created_at check (
  email_verification_expires_at is null or
  email_verification_expires_at>created_at
);

create unique index users_email_unique on users (lower(email));

create function set_password_changed_at () returns trigger language plpgsql as $$
begin
  new.password_changed_at = now();
  return new;
end;
$$;

create trigger users_set_password_changed_at
before update of password_hash on users for each row when (
  old.password_hash is distinct from new.password_hash
)
execute function set_password_changed_at ();

create table users_images (
  id uuid primary key default uuidv7(),
  created_at timestamptz(0) not null default now()::timestamptz(0),
  updated_at timestamptz(0) not null default now()::timestamptz(0),
  user_id uuid not null unique references users (id) on delete cascade,
  size_bytes numeric not null check (size_bytes>0 and size_bytes<=5000000),
  data bytea not null
);

create trigger users_images_set_updated_at
before update on users_images for each row
execute function set_updated_at ();

create table domains (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  updated_at timestamptz not null default now()::timestamptz(0),
  user_id uuid not null references users (id) on delete cascade,
  domain text not null,
  detected_at timestamptz(0), -- not null only if automatically discovered
  events_count numeric default 0,
  last_event_at timestamptz,
  currency char(3) default 'USD',
  report_enabled boolean not null default true,
  report_frequency text not null check (
    report_frequency in ('daily', 'weekly', 'monthly')
  ) default 'weekly',
  report_recipients text[] default '{}',
  report_last_sent_at timestamptz
);

create unique index domains_domain_unique on domains (lower(domain));

create index domains_user_id on domains (user_id);

create table domains_shares (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  revoked_at timestamptz(0),
  domain_id uuid not null references domains (id) on delete cascade,
  label text not null,
  show_revenue boolean not null default false,
  token_hash text not null unique
);

create index domains_shares_domain_id on domains_shares (domain_id);

create table delivered_reports (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  domain_id uuid not null references domains (id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  period_start timestamptz not null,
  sent_at timestamptz(0),
  unique (domain_id, period_start)
);

alter table delivered_reports
add constraint delivered_reports_sent_at_check_after_period_start check (
  sent_at is null or
  sent_at>=period_start
);

create table filter_presets (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  filters jsonb not null
);

alter table filter_presets
add constraint filter_presets_filters_check_object check (jsonb_typeof(filters)='object');

create index filter_presets_user_id on filter_presets (user_id);

create table goals (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  domain_id uuid not null references domains (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('page', 'event', 'scroll')),
  target text not null,
  threshold integer not null default 50,
  properties jsonb not null default '{}',
  unique (domain_id, name)
);

alter table goals
add constraint goals_threshold_check_range check (threshold between 1 and 100);

alter table goals
add constraint goals_properties_check_object check (jsonb_typeof(properties)='object');

create table subscriptions (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  updated_at timestamptz not null default now()::timestamptz(0),
  user_id uuid not null references users (id) on delete restrict,
  plan text not null,
  recurrence text not null check (recurrence in ('month', 'year')),
  status text not null check (status in ('active', 'canceled')),
  stripe_subscription_id text unique,
  cancel_at_period_end boolean not null default false,
  current_period_ends_at timestamptz
);

create index subscriptions_user_id on subscriptions (user_id);

create table payments (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  updated_at timestamptz not null default now()::timestamptz(0),
  paid_at timestamptz,
  user_id uuid references users (id) on delete set null,
  amount integer not null,
  currency char(3) not null,
  status text not null check (
    status in ('pending', 'paid', 'failed', 'refunded')
  ) default 'pending',
  provider text,
  provider_reference text,
  invoice_url text,
  unique (provider, provider_reference)
);

alter table payments
add constraint payments_amount_check_positive check (amount>0);

alter table payments
add constraint payments_provider_check_pair check ((provider is null)=(provider_reference is null));

create index payments_user_id on payments (user_id);

create table checkout_attempts (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  updated_at timestamptz not null default now()::timestamptz(0),
  user_id uuid not null references users (id) on delete cascade,
  plan text not null,
  recurrence text not null check (recurrence in ('month', 'year')),
  stripe_session_id text unique,
  url text,
  expires_at timestamptz(0),
  completed_at timestamptz(0)
);

alter table checkout_attempts
add constraint checkout_attempts_expires_at_check_after_created_at check (
  expires_at is null or
  expires_at>created_at
);

create unique index checkout_attempts_open_user on checkout_attempts (user_id)
where
  completed_at is null;

create table stripe_events (
  id text primary key,
  created_at timestamptz not null default now()::timestamptz(0)
);

create table plans (
  id uuid primary key default uuidv7(),
  created_at timestamptz not null default now()::timestamptz(0),
  name text not null,
  max_domains bigint not null,
  max_events bigint not null,
  monthly_price numeric(12, 2) not null,
  yearly_price numeric(12, 2) not null,
  valid_from timestamptz not null,
  description text,
  features text[] default '{}',
  unique (name, valid_from)
);

create table uptime_groups (
  id uuid primary key default uuidv7(),
  created_at timestamptz(0) not null default now()::timestamptz(0),
  updated_at timestamptz(0) not null default now()::timestamptz(0),
  user_id uuid not null references users (id) on delete cascade,
  label text not null,
  public boolean not null default false,
  slug text not null unique
);

create index uptime_groups_user_id on uptime_groups (user_id);

create table uptime_monitors (
  id uuid primary key default uuidv7(),
  created_at timestamptz(0) not null default now()::timestamptz(0),
  updated_at timestamptz(0) not null default now()::timestamptz(0),
  group_id uuid not null references uptime_groups (id) on delete cascade,
  label text not null,
  url text not null,
  auth_mode text not null check (auth_mode in ('none', 'headers')) default 'none',
  headers jsonb not null default '[]',
  recipients text[] not null default '{}',
  enabled boolean not null default true,
  threshold_seconds numeric not null,
  state text not null check (state in ('up', 'down')) default 'up',
  failed_at timestamptz(0),
  notified_at timestamptz(0)
);

create index uptime_monitors_group_id on uptime_monitors (group_id);

alter table plans
add constraint plans_monthly_price_check_positive check (monthly_price>=0);

alter table plans
add constraint plans_yearly_price_check_positive check (yearly_price>=0);

create trigger users_set_updated_at
before update on users for each row
execute function set_updated_at ();

create trigger domains_set_updated_at
before update on domains for each row
execute function set_updated_at ();

create trigger subscriptions_set_updated_at
before update on subscriptions for each row
execute function set_updated_at ();

create trigger payments_set_updated_at
before update on payments for each row
execute function set_updated_at ();

create trigger checkout_attempts_set_updated_at
before update on checkout_attempts for each row
execute function set_updated_at ();

create trigger uptime_groups_set_updated_at
before update on uptime_groups for each row
execute function set_updated_at ();

create trigger uptime_monitors_set_updated_at
before update on uptime_monitors for each row
execute function set_updated_at ();
