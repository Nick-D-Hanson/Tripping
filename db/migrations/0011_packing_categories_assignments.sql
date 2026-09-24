alter table packing_items
  add column if not exists category text not null default 'Other';

alter table packing_items
  add column if not exists assigned_to_member_id uuid references trip_members(id) on delete set null;
