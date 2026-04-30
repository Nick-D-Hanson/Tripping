create table if not exists food (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text,
  name text not null,
  url text,
  address text,
  lat double precision,
  lng double precision,
  datetime timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_trip_time_idx on food (trip_id, datetime);
