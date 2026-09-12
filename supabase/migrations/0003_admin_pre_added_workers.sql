-- ========== ADMIN PRE-ADDED WORKERS ==========
create table admin_pre_added_workers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  full_name text not null,
  added_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

alter table admin_pre_added_workers enable row level security;

-- Only admins can see this
create policy "Admins can manage pre-added workers" 
  on admin_pre_added_workers for all 
  using (is_admin());

-- (Auth server actions bypass RLS by using the service role or checking inside the action)
