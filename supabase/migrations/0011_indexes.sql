-- Migration: 0011_indexes
-- Description: Add B-Tree indexes for frequently queried foreign keys and statuses to optimize dashboard and list queries.

-- Index for Booking status (used heavily by admin dashboard and lists)
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);

-- Index for Booking customer_id (used heavily by farmer history view)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings (customer_id);

-- Index for Booking start_date (used heavily by scheduling views)
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON public.bookings (start_date);

-- Index for Assignments worker_id (used heavily by worker dashboard)
CREATE INDEX IF NOT EXISTS idx_booking_assignments_worker_id ON public.booking_assignments (worker_id);

-- Index for Assignments booking_id (used by admin to see who is assigned)
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking_id ON public.booking_assignments (booking_id);

-- Index for Workers profile_id (frequent join column)
CREATE INDEX IF NOT EXISTS idx_workers_profile_id ON public.workers (profile_id);
