do $$ begin
  create type idea_bucket_item_kind as enum ('housing', 'activity', 'food');
exception when duplicate_object then null;
end $$;

create table if not exists idea_bucket_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  kind idea_bucket_item_kind not null,
  description text not null,
  url text,
  notes text,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_bucket_items_trip_kind_idx on idea_bucket_items (trip_id, kind, created_at);
