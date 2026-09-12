-- ========== ADMIN DASHBOARD COUNTS RPC ==========
create or replace function get_admin_dashboard_counts()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'unaccepted_bookings',  (select count(*)::int from bookings where status = 'pending'),
    'unassigned_workers',   (
      select count(*)::int from workers w
      where w.is_on_leave = false
        and w.verified_at is not null
        and w.profile_id not in (
          select ba.worker_id from booking_assignments ba
          join bookings b on b.id = ba.booking_id
          where b.status in ('assigned','in_progress')
        )
    ),
    'in_progress_bookings', (select count(*)::int from bookings where status = 'in_progress'),
    'pending_workers',      (select count(*)::int from profiles where role = 'new_worker')
  );
$$;

-- ========== BATCH WORKER PAYROLL RPC (fixes N+1 query on /admin/workers) ==========
-- Returns days_worked for ALL workers for a given pay week start date in a single call
create or replace function get_all_workers_days_worked(p_week_start date)
returns table(worker_id uuid, days_worked int)
language sql
security definer
set search_path = public
as $$
  with week_days as (
    select generate_series(p_week_start, p_week_start + 6, interval '1 day')::date as day
  ),
  all_workers as (
    select profile_id from workers where verified_at is not null
  ),
  assigned_days as (
    select distinct ba.worker_id, wd.day
    from week_days wd
    join booking_assignments ba on true
    join bookings b on b.id = ba.booking_id
    where wd.day between b.start_date and (b.start_date + (b.expected_duration_days - 1))
      and b.status in ('assigned', 'in_progress', 'completed')
  ),
  leave_days as (
    select lp.worker_id, wd.day
    from week_days wd
    join worker_leave_periods lp on true
    where wd.day >= lp.start_date
      and (lp.end_date is null or wd.day <= lp.end_date)
  )
  select
    w.profile_id as worker_id,
    coalesce((
      select count(*)::int
      from assigned_days ad
      where ad.worker_id = w.profile_id
        and ad.day not in (
          select ld.day from leave_days ld where ld.worker_id = w.profile_id
        )
    ), 0) as days_worked
  from all_workers w;
$$;
