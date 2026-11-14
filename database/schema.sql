-- TerraRotate private farmer data schema for Supabase/PostgreSQL.
-- Public demo requests should remain ephemeral and must not be inserted as a user record.
create extension if not exists pgcrypto;

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  area_hectares numeric check (area_hectares is null or area_hectares > 0),
  boundary_geojson jsonb,
  soil_inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.rotation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid,
  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  data_provenance jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.farmer_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid,
  rotation_run_id uuid,
  rating smallint check (rating is null or rating between 1 and 5),
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade,
  foreign key (rotation_run_id, owner_id) references public.rotation_runs(id, owner_id) on delete cascade
);

create index if not exists fields_owner_idx on public.fields(owner_id);
create index if not exists rotation_runs_owner_created_idx on public.rotation_runs(owner_id, created_at desc);
create index if not exists rotation_runs_field_idx on public.rotation_runs(field_id);

alter table public.fields enable row level security;
alter table public.rotation_runs enable row level security;
alter table public.farmer_feedback enable row level security;

drop policy if exists "owners manage their fields" on public.fields;
create policy "owners manage their fields" on public.fields
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners manage their rotation runs" on public.rotation_runs;
create policy "owners manage their rotation runs" on public.rotation_runs
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners manage their feedback" on public.farmer_feedback;
create policy "owners manage their feedback" on public.farmer_feedback
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
