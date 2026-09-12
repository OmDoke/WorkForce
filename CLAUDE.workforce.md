# CLAUDE.md — Workforce (Grape Farm Labor Booking)

This file is read automatically at the start of every Claude Code session in this repo.
Keep this file short and behavioral — full product/architecture detail lives in
`docs/ARCHITECTURE.md`. **Read that file before implementing any feature end to end.**

## What this project is
Workforce connects grape farmers (**customers**) to farm labor (**workers**), with an
**admin** who reviews incoming work requests and dispatches worker(s) to each one.
MVP is scoped to a single crop (grapes) — the data model is built to extend to other
crops later, but do not build multi-crop UI yet; there is one hardcoded/seeded crop.

## Roles
- `admin` — reviews/accepts bookings, verifies & manages workers, assigns 1..N workers per booking
- `customer` — a farmer; registers via mobile OTP, submits a booking (farm size, work type(s), start date, expected duration)
- `worker` — verified labor; either self-registers via OTP (starts as `new_worker` pending admin verification) or is added directly by admin (immediately `worker`, no OTP needed)
- `new_worker` — transient status for self-registered workers awaiting admin verification

## Tech stack
- Next.js 15, App Router, TypeScript strict (no `any`)
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod on every form, client and server side
- TanStack Query for client-side server state where it provides real value; prefer
  Server Components + Server Actions for ordinary reads/mutations
- Supabase: Postgres, Auth (Phone OTP), Realtime, Storage
- SMS: MSG91 (India) — primary notification channel for MVP
- WhatsApp: Phase 2 only — do not build until explicitly asked

## Non-negotiable business rules
1. A booking can be assigned to **multiple workers**. Never model this as a single
   `worker_id` column on `bookings` — always use the `booking_assignments` join table.
2. Admin-added workers get `role = 'worker'` immediately, no OTP verification.
   Self-registered workers get `role = 'new_worker'` until an admin explicitly verifies them.
3. Booking status is an enum; see the state machine in `docs/ARCHITECTURE.md` §7.
   Every transition must also insert a row into `booking_status_history` —
   never silently overwrite `bookings.status`.
4. Row Level Security must be enabled on every table before any client query uses it.
   Customers see only their own bookings. Workers see only bookings they're assigned to.
   Admins see everything.
5. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client — server actions / route
   handlers only.
6. Worker daily availability defaults to **available**. The worker may set that day's
   status to `available` or `leave` only from **07:00–07:30** in the configured business
   timezone. The server must enforce this window; do not trust the browser clock. After
   07:30 the worker control is read-only for that date. Admin can override availability
   at any time.
7. "Unassigned worker" is derived: verified worker, not on leave for the relevant
   work dates, and not assigned to an overlapping `assigned`/`in_progress` booking.
   Non-overlapping future assignments are allowed.
8. Customer profiles collect a **farm address**, not a home address — one farm per
   customer account for MVP. Worker and admin profiles collect a **home address**.
   Same `profiles.address` column, different meaning by role — don't add a second
   address field without checking `docs/ARCHITECTURE.md` §12 first.
9. Workers are paid **weekly, Friday to Friday**. The worker list must show a
   days-worked-this-pay-week count per worker, computed via the
   `worker_days_worked()` SQL function — it excludes leave days and unassigned
   days. Never hand-roll this count in application code; use the function so the
   exclusion logic lives in one place. See `docs/ARCHITECTURE.md` §14.
10. Admin can flip a worker's Active/On Leave status directly from the worker list
    (not just the worker themselves). This must open/close a row in
    `worker_leave_periods`, not just toggle the `workers.is_on_leave` boolean —
    otherwise the payroll count in rule 9 goes wrong.

## Important implementation boundary

Do not create an Axios-based internal REST API just because the app has a backend.
In Next.js App Router, prefer Server Components for reads and Server Actions for
authenticated mutations. Use route handlers only for real HTTP integrations such as
webhooks/provider callbacks. Keep Supabase service-role credentials server-side.

## Commands
Fill these in once the project is scaffolded — keep this section current:
```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Folder structure
```
app/
├── (public)/          # marketing landing page (grape farm photos, login CTA)
├── (auth)/            # OTP login/verify — shared by customer & worker
├── (customer)/
├── (worker)/
├── (admin)/
├── middleware.ts       # role-based route guard
supabase/
├── migrations/
docs/
├── ARCHITECTURE.md
├── DECISIONS.md        # why key decisions were made — check before re-litigating one
```

## When implementing a feature
1. Check `docs/ARCHITECTURE.md` for the relevant flow and schema section first.
2. Write/confirm the RLS policy for any new or changed table before writing the
   query that depends on it.
3. Validate all form input with a Zod schema shared between client and server.
4. If you make a schema or flow decision not already documented, add it to
   `docs/ARCHITECTURE.md` in the same change — don't let the doc drift from the code.
5. If you're about to change something that contradicts an existing entry in
   `docs/DECISIONS.md`, flag it explicitly rather than silently overriding it —
   there was a reason for the original call.
