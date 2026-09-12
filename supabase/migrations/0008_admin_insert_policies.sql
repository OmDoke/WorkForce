-- Fix: Admin INSERT on booking_status_history needs explicit WITH CHECK
-- The FOR ALL USING pattern does not cover INSERT in strict Postgres RLS enforcement
create policy "Admins can insert status history"
  on booking_status_history for insert
  with check (is_admin());

-- Fix: Admin INSERT on booking_assignments needs explicit WITH CHECK
create policy "Admins can insert booking assignments"
  on booking_assignments for insert
  with check (is_admin());

-- Fix: Admin INSERT on notification_log needs explicit WITH CHECK
create policy "Admins can insert notification log"
  on notification_log for insert
  with check (is_admin());
