-- ========== FIX ALL RLS POLICIES FOR REGISTRATION & BOOKINGS ==========

-- 1. Helper function to check booking ownership safely
CREATE OR REPLACE FUNCTION public.booking_belongs_to_current_user(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists(SELECT 1 FROM bookings WHERE id = p_booking_id AND customer_id = auth.uid());
$$;

-- 2. Allow customers to insert their own bookings
DROP POLICY IF EXISTS "Customers can insert own bookings" ON bookings;
CREATE POLICY "Customers can insert own bookings" 
ON bookings FOR INSERT 
WITH CHECK (customer_id = auth.uid());

-- 3. Allow customers to insert work types for their bookings
DROP POLICY IF EXISTS "Customers can insert own booking work types" ON booking_work_types;
CREATE POLICY "Customers can insert own booking work types"
ON booking_work_types FOR INSERT
WITH CHECK (public.booking_belongs_to_current_user(booking_id));

-- 4. Allow customers to insert status history for their bookings
DROP POLICY IF EXISTS "Customers can insert status history for own bookings" ON booking_status_history;
CREATE POLICY "Customers can insert status history for own bookings"
ON booking_status_history FOR INSERT
WITH CHECK (public.booking_belongs_to_current_user(booking_id));

-- 5. Allow users to register (insert their own profile)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 6. Allow workers to register (insert their own worker details)
DROP POLICY IF EXISTS "Workers can insert own worker row" ON workers;
CREATE POLICY "Workers can insert own worker row" 
ON workers FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

-- 7. Allow workers to verify admin invites during registration
DROP POLICY IF EXISTS "Workers can view their own pre-added record" ON admin_pre_added_workers;
CREATE POLICY "Workers can view their own pre-added record"
ON admin_pre_added_workers FOR SELECT
USING (phone = (SELECT phone FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Workers can delete their own pre-added record" ON admin_pre_added_workers;
CREATE POLICY "Workers can delete their own pre-added record"
ON admin_pre_added_workers FOR DELETE
USING (phone = (SELECT phone FROM auth.users WHERE id = auth.uid()));
