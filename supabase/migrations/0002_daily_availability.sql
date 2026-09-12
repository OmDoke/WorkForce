-- ========== DAILY WORKER AVAILABILITY ==========
create type worker_daily_status as enum ('available', 'leave');

create table worker_daily_availability (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(profile_id) on delete cascade not null,
  availability_date date not null,
  status worker_daily_status not null,
  updated_by uuid references profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (worker_id, availability_date)
);

alter table worker_daily_availability enable row level security;

create policy "Workers can view own daily availability" 
  on worker_daily_availability for select 
  using (worker_id = auth.uid());

create policy "Workers can update own daily availability" 
  on worker_daily_availability for all 
  using (worker_id = auth.uid());

create policy "Admins have full access to daily availability" 
  on worker_daily_availability for all 
  using (is_admin());
