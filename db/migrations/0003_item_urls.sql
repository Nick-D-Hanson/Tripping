alter table travel_segments
  add column if not exists url text;

alter table lodging
  add column if not exists url text;

alter table activities
  add column if not exists url text;
