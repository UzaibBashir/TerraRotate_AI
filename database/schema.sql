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

-- Supporting domain tables for authenticated field workflows. Public demo mode
-- remains read-only and anonymous users cannot create shared farm records.
create table if not exists public.user_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(display_name) <= 120),
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_boundaries (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, geometry jsonb not null check (geometry->>'type' = 'Polygon'),
  area_hectares numeric check (area_hectares is null or area_hectares > 0),
  source text not null default 'farmer supplied', created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.soil_profiles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, texture text, ph numeric check (ph is null or ph between 0 and 14),
  organic_matter_percent numeric check (organic_matter_percent is null or organic_matter_percent between 0 and 100),
  nutrients jsonb not null default '{}'::jsonb, source text not null default 'farmer supplied',
  sampled_at date, created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.crop_profiles (
  id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade,
  crop_key text not null, name text not null, family text, attributes jsonb not null default '{}'::jsonb,
  source_url text, verified_for_region text, created_at timestamptz not null default now(),
  unique (owner_id, crop_key)
);

create table if not exists public.crop_history (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, crop_key text not null, season_start date, season_end date,
  notes text check (notes is null or length(notes) <= 4000), source text not null default 'farmer supplied',
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade,
  check (season_end is null or season_start is null or season_end >= season_start)
);

create table if not exists public.nasa_resources (
  id uuid primary key default gen_random_uuid(), resource_key text not null unique,
  resource_name text not null, provider text not null default 'NASA', official_url text not null,
  product_identifier text, variables text[] not null default '{}', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.nasa_observations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, resource_id uuid references public.nasa_resources(id) on delete set null,
  observation_date date not null, variable text not null, value double precision,
  unit text, latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  spatial_resolution text, temporal_resolution text, product_version text,
  quality_status text not null default 'unknown', provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.weather_observations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, observation_date date not null, variable text not null, value double precision,
  unit text, source text not null, provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.water_assessments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, inputs jsonb not null, result jsonb not null, provenance jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.crop_stress_assessments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, method text not null, result jsonb not null,
  disclaimer text not null default 'Exploratory vegetation analysis; not a crop diagnosis.',
  provenance jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.rotation_plans (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, current_crop text not null, planning_horizon smallint not null default 3 check (planning_horizon between 1 and 12),
  inputs jsonb not null, method text not null, created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade,
  unique (id, owner_id)
);

create table if not exists public.rotation_candidates (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null, sequence jsonb not null, rank integer not null check (rank > 0),
  total_score numeric not null, explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (plan_id, owner_id) references public.rotation_plans(id, owner_id) on delete cascade,
  unique (id, owner_id), unique (plan_id, rank)
);

create table if not exists public.rotation_scores (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid not null, criterion text not null, score numeric not null,
  weight numeric not null check (weight >= 0), explanation text,
  created_at timestamptz not null default now(),
  foreign key (candidate_id, owner_id) references public.rotation_candidates(id, owner_id) on delete cascade,
  unique (candidate_id, criterion)
);

create table if not exists public.climate_scenarios (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, provider text not null, scenario text not null, model text,
  period_start date, period_end date, scenario_values jsonb not null, provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.field_zones (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, zone_key text not null, geometry jsonb,
  sample_count integer not null default 0 check (sample_count >= 0), summary jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade,
  unique (field_id, zone_key)
);

create table if not exists public.recommendation_history (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, recommendation_type text not null, input_snapshot jsonb not null,
  output_snapshot jsonb not null, provenance jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null, report_type text not null, report_data jsonb not null,
  storage_path text, created_at timestamptz not null default now(),
  foreign key (field_id, owner_id) references public.fields(id, owner_id) on delete cascade
);

-- RLS on all private data tables. Each policy binds rows to the authenticated owner.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'user_profiles','field_boundaries','soil_profiles','crop_history',
    'nasa_observations','weather_observations','water_assessments','crop_stress_assessments',
    'rotation_plans','rotation_candidates','rotation_scores','climate_scenarios','field_zones',
    'recommendation_history','reports'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "owners manage rows" on public.%I', table_name);
    execute format('create policy "owners manage rows" on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', table_name);
  end loop;
end $$;

alter table public.nasa_resources enable row level security;
drop policy if exists "anyone can read resource register" on public.nasa_resources;
create policy "anyone can read resource register" on public.nasa_resources
  for select to anon, authenticated using (true);

alter table public.crop_profiles enable row level security;
drop policy if exists "read global crop catalog" on public.crop_profiles;
create policy "read global crop catalog" on public.crop_profiles
  for select to anon, authenticated using (owner_id is null);
drop policy if exists "owners manage rows" on public.crop_profiles;
create policy "owners manage rows" on public.crop_profiles
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create index if not exists field_boundaries_field_idx on public.field_boundaries(field_id, owner_id);
create index if not exists soil_profiles_field_idx on public.soil_profiles(field_id, owner_id, created_at desc);
create index if not exists crop_history_field_season_idx on public.crop_history(field_id, owner_id, season_start desc);
create index if not exists nasa_observations_field_date_idx on public.nasa_observations(field_id, owner_id, observation_date desc);
create index if not exists weather_observations_field_date_idx on public.weather_observations(field_id, owner_id, observation_date desc);
create index if not exists water_assessments_field_idx on public.water_assessments(field_id, owner_id, created_at desc);
create index if not exists crop_stress_field_idx on public.crop_stress_assessments(field_id, owner_id, created_at desc);
create index if not exists rotation_plans_field_idx on public.rotation_plans(field_id, owner_id, created_at desc);
create index if not exists rotation_candidates_plan_idx on public.rotation_candidates(plan_id, owner_id, rank);
create index if not exists field_zones_field_idx on public.field_zones(field_id, owner_id);
create index if not exists recommendation_history_field_idx on public.recommendation_history(field_id, owner_id, created_at desc);
create index if not exists reports_field_idx on public.reports(field_id, owner_id, created_at desc);
