create extension if not exists pgcrypto;

do $$ begin
  create type trip_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type travel_segment_type as enum ('flight', 'drive', 'train', 'ferry', 'walk', 'other');
exception when duplicate_object then null;
end $$;

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id text,
  email text,
  role trip_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

create unique index if not exists trip_members_trip_user_idx
  on trip_members (trip_id, user_id)
  where user_id is not null;

create unique index if not exists trip_members_trip_email_idx
  on trip_members (trip_id, lower(email))
  where email is not null;

create table if not exists travel_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text,
  url text,
  type travel_segment_type not null,
  start_location_name text not null,
  start_address text,
  start_lat double precision,
  start_lng double precision,
  end_location_name text not null,
  end_address text,
  end_lat double precision,
  end_lng double precision,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lodging (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text,
  name text not null,
  url text,
  address text,
  lat double precision,
  lng double precision,
  check_in timestamptz not null,
  check_out timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text,
  name text not null,
  url text,
  address text,
  lat double precision,
  lng double precision,
  datetime timestamptz not null,
  category text,
  include_in_route boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_owner_id_idx on trips (owner_id);
create index if not exists trip_members_trip_id_idx on trip_members (trip_id);
create index if not exists trip_members_user_id_idx on trip_members (user_id);
create index if not exists travel_segments_trip_time_idx on travel_segments (trip_id, start_datetime);
create index if not exists lodging_trip_time_idx on lodging (trip_id, check_in);
create index if not exists activities_trip_time_idx on activities (trip_id, datetime);
