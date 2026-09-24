alter table food
  add column if not exists category text not null default 'meal';
