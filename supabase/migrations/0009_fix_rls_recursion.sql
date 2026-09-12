-- ========== FIX RLS INFINITE RECURSION ==========
-- Root cause: "Customers can manage own bookings" uses FOR ALL which applies USING as
-- WITH CHECK for INSERTs. This is fine. But the duplicate "Customers can insert own bookings"
-- from 0006 conflicts and causes recursion when combined with other policies.
-- Also: booking_work_types and booking_status_history subqueries into bookings which
-- can recurse back through the bookings policy chain during INSERT.

-- STEP 1: Drop the conflicting INSERT policies added in 0006
drop policy if exists "Customers can insert own bookings" on bookings;
drop policy if exists "Customers can insert own booking work types" on booking_work_types;
drop policy if exists "Customers can insert status history for own bookings" on booking_status_history;

-- STEP 2: The existing "Customers can manage own bookings" FOR ALL USING (customer_id = auth.uid())
-- already handles SELECT/UPDATE/DELETE. For INSERT, USING is used as WITH CHECK automatically.
-- So customer INSERT on bookings is already covered. No extra policy needed.

-- STEP 3: Fix booking_work_types INSERT — use auth.uid() directly without re-querying bookings
-- We use a security definer helper to avoid the recursion chain.
create or replace function booking_belongs_to_current_user(p_booking_id uuid)
returns boolean
language sql security definer
set search_path = public
as $$
  select exists(select 1 from bookings where id = p_booking_id and customer_id = auth.uid());
$$;

-- Drop old FOR ALL policy that was causing recursive subquery during INSERT check
drop policy if exists "Customers can manage own booking work types" on booking_work_types;

-- Recreate split policies: SELECT/UPDATE/DELETE use the direct subquery (fine for reads)
create policy "Customers can select own booking work types"
  on booking_work_types for select
  using (
    exists (select 1 from bookings where id = booking_work_types.booking_id and customer_id = auth.uid())
  );

-- INSERT uses the security definer function to break the recursion chain
create policy "Customers can insert own booking work types"
  on booking_work_types for insert
  with check (
    booking_belongs_to_current_user(booking_work_types.booking_id)
  );

-- STEP 4: Fix booking_status_history INSERT the same way
drop policy if exists "Customers can view status history of own bookings" on booking_status_history;

create policy "Customers can view status history of own bookings"
  on booking_status_history for select
  using (
    exists (select 1 from bookings where id = booking_status_history.booking_id and customer_id = auth.uid())
  );

create policy "Customers can insert status history for own bookings"
  on booking_status_history for insert
  with check (
    booking_belongs_to_current_user(booking_status_history.booking_id)
  );

-- Also drop and re-create booking_assignments select for customers (uses subquery to bookings)
drop policy if exists "Customers can view assignments on own bookings" on booking_assignments;

create policy "Customers can view assignments on own bookings"
  on booking_assignments for select
  using (
    booking_belongs_to_current_user(booking_assignments.booking_id)
  );
