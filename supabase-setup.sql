-- =============================================
-- EN PLATTFORM - Supabase Database Setup
-- Kjør dette i Supabase SQL Editor
-- =============================================

-- 1. PROFILES TABLE (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  role text default 'ansatt' check (role in ('admin', 'prosjektleder', 'ansatt', 'regnskapsforer', 'user')),
  phone text,
  position text,
  department text,
  custom_module_access text[],
  assigned_projects uuid[],
  managed_projects uuid[],
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. PROJECTS TABLE
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  client_name text,
  client_contact text,
  client_email text,
  client_phone text,
  address text,
  status text default 'aktiv' check (status in ('aktiv', 'fullfort', 'avbrutt', 'planlagt')),
  start_date date,
  end_date date,
  budget numeric,
  project_number text,
  project_manager_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.projects enable row level security;

create policy "Authenticated users can view projects"
  on public.projects for select
  using (auth.role() = 'authenticated');

create policy "Admins and project managers can insert projects"
  on public.projects for insert
  with check (auth.role() = 'authenticated');

create policy "Admins and project managers can update projects"
  on public.projects for update
  using (auth.role() = 'authenticated');

-- 6. DEVIATIONS (AVVIK) TABLE
create table if not exists public.deviations (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  project_id uuid references public.projects(id),
  status text default 'åpen' check (status in ('åpen', 'under_behandling', 'lukket')),
  severity text default 'lav' check (severity in ('lav', 'middels', 'høy', 'kritisk')),
  category text,
  location text,
  reported_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  due_date date,
  closed_date date,
  images text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.deviations enable row level security;

create policy "Authenticated users can view deviations"
  on public.deviations for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert deviations"
  on public.deviations for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update deviations"
  on public.deviations for update
  using (auth.role() = 'authenticated');

-- 7. CHECKLISTS (SJEKKLISTER) TABLE
create table if not exists public.checklists (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  project_id uuid references public.projects(id),
  template_id uuid,
  status text default 'ikke_startet' check (status in ('ikke_startet', 'påbegynt', 'fullfort')),
  assigned_to uuid references public.profiles(id),
  due_date date,
  completed_date date,
  items jsonb default '[]',
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.checklists enable row level security;

create policy "Authenticated users can view checklists"
  on public.checklists for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage checklists"
  on public.checklists for all
  using (auth.role() = 'authenticated');

-- 8. FILES (PROSJEKTFILER) TABLE
create table if not exists public.project_files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  project_id uuid references public.projects(id),
  file_url text,
  file_type text,
  file_size bigint,
  category text,
  access_level text default 'alle' check (access_level in ('alle', 'prosjektleder', 'admin')),
  uploaded_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.project_files enable row level security;

create policy "Authenticated users can view files"
  on public.project_files for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can upload files"
  on public.project_files for insert
  with check (auth.role() = 'authenticated');

-- 9. MACHINES (MASKINER) TABLE
create table if not exists public.machines (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text,
  serial_number text,
  registration_number text,
  manufacturer text,
  model text,
  year integer,
  status text default 'tilgjengelig' check (status in ('tilgjengelig', 'i_bruk', 'vedlikehold', 'utrangert')),
  current_project_id uuid references public.projects(id),
  next_service_date date,
  insurance_expiry date,
  notes text,
  images text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.machines enable row level security;

create policy "Authenticated users can view machines"
  on public.machines for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage machines"
  on public.machines for all
  using (auth.role() = 'authenticated');

-- 10. HMS TABLE
create table if not exists public.hms_records (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text check (type in ('sja', 'ruh', 'risikoanalyse', 'hmshandbok')),
  project_id uuid references public.projects(id),
  status text default 'aktiv',
  content jsonb default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.hms_records enable row level security;

create policy "Authenticated users can manage hms records"
  on public.hms_records for all
  using (auth.role() = 'authenticated');

-- 11. Storage bucket for files
insert into storage.buckets (id, name, public)
values ('plattform-files', 'plattform-files', false)
on conflict do nothing;

create policy "Authenticated users can upload files"
  on storage.objects for insert
  with check (bucket_id = 'plattform-files' and auth.role() = 'authenticated');

create policy "Authenticated users can view files"
  on storage.objects for select
  using (bucket_id = 'plattform-files' and auth.role() = 'authenticated');

create policy "Authenticated users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'plattform-files' and auth.uid() = owner);

-- Done! ✅
select 'Database setup complete!' as status;
