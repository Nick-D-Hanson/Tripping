alter table idea_bucket_items
  add column if not exists location_name text,
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;
