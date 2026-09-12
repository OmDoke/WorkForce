-- ========== ENUMS ==========
create type user_role as enum ('admin', 'customer', 'worker', 'new_worker');
create type gender_type as enum ('male', 'female', 'other');
create type booking_status as enum (
  'pending', 'accepted', 'assigned', 'in_progress',
  'completed', 'rejected', 'cancelled'
);

-- ========== PROFILES (extends auth.users; shared base for all roles) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text not null,
  phone text unique not null,
  address text,   -- semantics depend on role: FARM address for customers, HOME address for workers/admins
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========== WORKER-SPECIFIC FIELDS ==========
create table workers (
  profile_id uuid primary key references profiles(id) on delete cascade,
  gender gender_type,
  has_bike boolean default false,
  is_on_leave boolean default false,       -- default ACTIVE (false = not on leave)
  added_by_admin uuid references profiles(id), -- null if self-registered
  verified_at timestamptz,                 -- null until admin verifies (self-reg path)
  verified_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ========== WORKER LEAVE PERIODS (for accurate weekly payroll counts) ==========
-- One row per leave stretch. end_date null = leave is still ongoing.
create table worker_leave_periods (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(profile_id) on delete cascade,
  start_date date not null,
  end_date date,
  created_by uuid references profiles(id)  -- worker themself, or an admin override
);

-- ========== CROPS (single row for MVP: "Grapes") ==========
create table crops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean default true
);

-- ========== WORK TYPES (scoped to a crop) ==========
create table work_types (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid references crops(id) on delete cascade,
  name text not null,       -- e.g. "Bagging", "Pruning", "GA3 Dipping"
  is_active boolean default true
);

-- ========== BOOKINGS ==========
create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) not null,
  crop_id uuid references crops(id) not null,
  farm_size_acres numeric(6,2) not null,
  estimated_workers_needed int,              -- optional, farmer's estimate
  start_date date not null,
  expected_duration_days int not null,
  status booking_status not null default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========== BOOKING <-> WORK TYPES (multi-select) ==========
create table booking_work_types (
  booking_id uuid references bookings(id) on delete cascade,
  work_type_id uuid references work_types(id),
  primary key (booking_id, work_type_id)
);

-- ========== BOOKING <-> WORKERS (supports many workers per booking) ==========
create table booking_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  worker_id uuid references workers(profile_id),
  assigned_by uuid references profiles(id) not null, -- admin who assigned
  assigned_at timestamptz default now()
);

-- ========== STATUS HISTORY (audit trail) ==========
create table booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  status booking_status not null,
  changed_by uuid references profiles(id),
  note text,
  changed_at timestamptz default now()
);

-- ========== NOTIFICATION LOG (for debugging delivery, not app logic) ==========
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id),
  booking_id uuid references bookings(id),
  channel text not null,          -- 'sms' | 'whatsapp'
  message text not null,
  status text not null default 'sent',  -- 'sent' | 'failed'
  sent_at timestamptz default now()
);

-- ========== DAYS WORKED IN A PAY WEEK (Friday → Thursday, paid on Friday) ==========
create or replace function worker_days_worked(p_worker_id uuid, p_week_start date)
returns int
language sql
stable
as $$
  with week_days as (
    select generate_series(p_week_start, p_week_start + 6, interval '1 day')::date as day
  ),
  assigned_days as (
    select distinct wd.day
    from week_days wd
    join booking_assignments ba on ba.worker_id = p_worker_id
    join bookings b on b.id = ba.booking_id
    where wd.day between b.start_date and (b.start_date + (b.expected_duration_days - 1))
      and b.status in ('assigned', 'in_progress', 'completed')
  ),
  leave_days as (
    select wd.day
    from week_days wd
    join worker_leave_periods lp on lp.worker_id = p_worker_id
    where wd.day >= lp.start_date
      and (lp.end_date is null or wd.day <= lp.end_date)
  )
  select count(*)::int
  from assigned_days
  where day not in (select day from leave_days);
$$;

-- seed data
insert into crops (name) values ('Grapes');


-- ========== ROW LEVEL SECURITY (RLS) POLICIES ==========

create or replace function is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

alter table profiles enable row level security;
alter table workers enable row level security;
alter table worker_leave_periods enable row level security;
alter table crops enable row level security;
alter table work_types enable row level security;
alter table bookings enable row level security;
alter table booking_work_types enable row level security;
alter table booking_assignments enable row level security;
alter table booking_status_history enable row level security;
alter table notification_log enable row level security;

-- Profiles: read/update own row, Admin full access
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins have full access to profiles" on profiles for all using (is_admin());
-- Allow creation of own profile
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Workers: read assigned workers (for customers? ARCHITECTURE says read limited public fields of assigned workers only, but let's keep it simple for now or implement as spec: "read limited public fields of assigned workers only")
-- Update own row, Admin full access
create policy "Workers can update own worker row" on workers for update using (auth.uid() = profile_id);
create policy "Workers can view own worker row" on workers for select using (auth.uid() = profile_id);
create policy "Admins have full access to workers" on workers for all using (is_admin());
-- Customer view workers if assigned
create policy "Customers can view workers assigned to their bookings" on workers for select using (
  exists (
    select 1 from booking_assignments ba
    join bookings b on b.id = ba.booking_id
    where ba.worker_id = workers.profile_id and b.customer_id = auth.uid()
  )
);

-- Worker Leave Periods: workers view their own, admins all
create policy "Workers can view own leave periods" on worker_leave_periods for select using (worker_id = auth.uid());
create policy "Workers can manage own leave periods" on worker_leave_periods for all using (worker_id = auth.uid());
create policy "Admins have full access to leave periods" on worker_leave_periods for all using (is_admin());

-- Crops: all can read, admin can write
create policy "Everyone can view active crops" on crops for select using (is_active = true);
create policy "Admins can manage crops" on crops for all using (is_admin());

-- Work Types: all can read, admin can write
create policy "Everyone can view active work types" on work_types for select using (is_active = true);
create policy "Admins can manage work types" on work_types for all using (is_admin());

-- Bookings: CRUD own bookings only, Worker read if assigned, Admin full access
create policy "Customers can manage own bookings" on bookings for all using (customer_id = auth.uid());
create policy "Workers can view bookings they are assigned to" on bookings for select using (
  exists (select 1 from booking_assignments where booking_id = bookings.id and worker_id = auth.uid())
);
create policy "Admins have full access to bookings" on bookings for all using (is_admin());

-- Booking Work Types: Customer manage own, Admin full access, Worker read assigned
create policy "Customers can manage own booking work types" on booking_work_types for all using (
  exists (select 1 from bookings where id = booking_work_types.booking_id and customer_id = auth.uid())
);
create policy "Workers can view work types of assigned bookings" on booking_work_types for select using (
  exists (select 1 from booking_assignments where booking_id = booking_work_types.booking_id and worker_id = auth.uid())
);
create policy "Admins have full access to booking work types" on booking_work_types for all using (is_admin());

-- Booking Assignments: Customer read own, Worker read own, Admin full access
create policy "Customers can view assignments on own bookings" on booking_assignments for select using (
  exists (select 1 from bookings where id = booking_assignments.booking_id and customer_id = auth.uid())
);
create policy "Workers can view own assignments" on booking_assignments for select using (worker_id = auth.uid());
create policy "Admins have full access to booking assignments" on booking_assignments for all using (is_admin());

-- Booking Status History: Customer read own, Worker read assigned, Admin full access
create policy "Customers can view status history of own bookings" on booking_status_history for select using (
  exists (select 1 from bookings where id = booking_status_history.booking_id and customer_id = auth.uid())
);
create policy "Workers can view status history of assigned bookings" on booking_status_history for select using (
  exists (select 1 from booking_assignments where booking_id = booking_status_history.booking_id and worker_id = auth.uid())
);
create policy "Admins have full access to status history" on booking_status_history for all using (is_admin());

-- Notification Log: Admin only
create policy "Admins have full access to notification log" on notification_log for all using (is_admin());
