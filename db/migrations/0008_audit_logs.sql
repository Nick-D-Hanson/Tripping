do $$ begin
  create type audit_log_action as enum (
    'trip_created',
    'trip_updated',
    'trip_deleted',
    'member_invited',
    'member_role_updated',
    'member_removed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete set null,
  actor_user_id text not null,
  action audit_log_action not null,
  target_type text not null,
  target_id text,
  request_id text,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_trip_created_idx on audit_logs (trip_id, created_at desc);
create index if not exists audit_logs_actor_created_idx on audit_logs (actor_user_id, created_at desc);
