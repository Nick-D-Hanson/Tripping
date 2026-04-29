alter table lodging
  add column if not exists title text;

alter table activities
  add column if not exists title text;
