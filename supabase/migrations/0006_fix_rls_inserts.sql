-- Allow customers to insert bookings explicitly
create policy "Customers can insert own bookings" 
  on bookings for insert 
  with check (customer_id = auth.uid());

-- Allow customers to insert booking work types explicitly
create policy "Customers can insert own booking work types" 
  on booking_work_types for insert 
  with check (
    exists (select 1 from bookings where id = booking_work_types.booking_id and customer_id = auth.uid())
  );

-- Allow customers to insert booking status history
create policy "Customers can insert status history for own bookings" 
  on booking_status_history for insert 
  with check (
    exists (select 1 from bookings where id = booking_status_history.booking_id and customer_id = auth.uid())
  );

-- Allow workers to read their own pre-added worker record during auth
create policy "Workers can view their own pre-added record"
  on admin_pre_added_workers for select
  using (
    -- During OTP verification, auth.jwt() might contain phone, but it's safer to just check auth.uid() 
    -- wait, before they complete profile, they just logged in, so auth.uid() is available, and their phone is in auth.users
    -- Let's allow select if the phone matches the authenticated user's phone
    phone = (select phone from auth.users where id = auth.uid())
  );

-- Allow workers to delete their own pre-added record after completing profile
create policy "Workers can delete their own pre-added record"
  on admin_pre_added_workers for delete
  using (
    phone = (select phone from auth.users where id = auth.uid())
  );
