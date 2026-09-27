do $$ begin
  create type trip_item_vote_type as enum ('travel', 'lodging', 'activity', 'food', 'idea');
exception when duplicate_object then null;
end $$;

create table if not exists trip_item_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  item_type trip_item_vote_type not null,
  item_id uuid not null,
  user_id text not null,
  vote smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_item_votes_value_check check (vote in (-1, 1))
);

create unique index if not exists trip_item_votes_person_item_idx
  on trip_item_votes (trip_id, item_type, item_id, user_id);

create index if not exists trip_item_votes_trip_item_idx
  on trip_item_votes (trip_id, item_type, item_id);
