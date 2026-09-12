# Workforce — Architecture & Product Specification (v1)

**Scope:** MVP for grape farm labor booking. Three roles: Admin, Customer (farmer), Worker.
**Stack:** Next.js 15 (App Router, TypeScript) + Supabase (Postgres, Auth, Realtime, Storage)

This is the source of truth for building this app, including with an AI coding agent
(Claude Code). `CLAUDE.md` at the repo root is the short version an agent reads every
session; this file is the detailed version it should read before implementing anything.
`docs/DECISIONS.md` records *why* key calls were made — check it before revisiting one.

---

## 1. What This Is

A dispatch platform for grape farm labor:

- **Farmers (customers)** post a work request: what needs doing on their grape farm,
  how big the farm is, when they want it started, and for how long.
- **Admin** reviews the request, accepts or rejects it, and assigns one or more
  **workers** to do the job.
- **Workers** are notified (SMS today, WhatsApp later) and show up to do the work.
  They also self-manage a simple daily availability status.

The MVP is deliberately single-crop (grapes) and admin-dispatched (no self-serve
worker marketplace, no auto-matching) — that keeps v1 small and shippable. The data
model is built so a second crop or auto-matching can be added later without a rewrite.

---

## 2. Roles

| Role | How they get this role | What they can do |
|---|---|---|
| `admin` | Created manually (not self-serve signup) | Accept/reject bookings, assign 1..N workers to a booking, verify or directly add workers, manage worker leave/status visibility |
| `customer` | Self-register via mobile OTP on the public site | Submit a booking, track its status, view history |
| `worker` | Two paths — see §6 | Toggle daily availability; receives job notifications by SMS/WhatsApp |
| `new_worker` | Self-registered worker, not yet verified | Can log in and see a "pending verification" screen only — cannot be assigned work |

---

## 3. Public Landing Page

- Marketing content: grape farm photography, short description of what the platform does.
- A **Login / Register** button, top corner — this starts the **customer** OTP flow
  (this page is farmer-facing by default).
- A smaller, secondary link: *"Are you a worker? Register here"* → worker OTP flow.
  Keep this visually secondary — the landing page's primary audience is farmers.
- **Admin login is not linked from this public page at all.** Use a separate,
  unlisted route (e.g. `/admin/login`) — don't expose an admin entry point to
  the public marketing site.

---

## 4. Customer (Farmer) Flow

1. Tap Login/Register → enter mobile number → receive OTP → verify.
2. **If new number:** registration form — Full Name (required), **Farm Address**
   (required — this is the farmer's grape farm location, not a home address; a
   customer account represents one farm for now), Mobile Number (required,
   already captured/verified via OTP).
3. **If existing:** go straight to dashboard.
4. **Dashboard:**
   - If they have an ongoing/upcoming booking: show it with live status + a calendar
     view of the scheduled date.
   - If they don't: show a "Book your slot" call to action.
5. **Left sidebar:** `Add New Booking`, `History`.
6. **New Booking form** — captures, in order:
   1. Farm size (in acres) — numeric, decimals allowed (e.g. 0.25, 1.5)
   2. Crop type — for MVP this is a single fixed option, "Grapes" (pre-selected;
      build the field as a dropdown anyway so a second crop is a data change, not
      a code change, later)
   3. Work type(s) — **filtered by the crop selected above**, multi-select.
      For Grapes, seed with (confirm/refine this list with the actual terms used
      on the ground — these are common Indian table-grape farming tasks):
      - Bagging (fruit bag work)
      - Pruning
      - Thinning
      - Girdling
      - GA3 Dipping
      - Spraying
      - Trellising / Wire tying
      - Weeding
      - Leaf plucking
      - Harvesting / Picking
   4. Start date — calendar picker
   5. Expected completion — in days (numeric)
   6. **Recommended addition:** estimated number of workers needed (optional) —
      admin makes the final call, but a farmer's estimate helps admin plan capacity
      before opening the booking detail page.
7. On submit → booking status = `pending`. Customer sees it in "ongoing" with status
   badge, and it appears in admin's unaccepted queue.
8. The calendar is a **requested start-date calendar**, not a guaranteed slot inventory
   system in MVP. A selected date means "I want work to start on this date"; admin
   acceptance and worker assignment determine whether the request can actually be fulfilled.
9. Status updates flow through in real time: `pending → accepted → assigned → in_progress → completed`.

---

## 5. Admin Flow

### 5.1 Dashboard (landing page after admin login)
Key numbers, at minimum:
- Unaccepted bookings (new, awaiting admin action)
- Unassigned workers (active, verified, not on leave, not currently on a job — see
  `CLAUDE.md` rule 7 for the exact definition)
- Bookings currently in progress
- Workers pending verification (new self-registrations)

### 5.2 Booking Management (left sidebar → "Bookings")
- Summary counts: Total, Unaccepted, Working (in progress), Completed
- Full list, filterable by status
- **Booking detail page:** shows everything the farmer submitted (farm size, crop,
  work types, address, start date, expected duration). Actions:
  - **Accept** or **Reject** (if status is `pending`)
  - **Assign Worker(s)** (once accepted) — a searchable multi-select list showing
    **only** workers who are: verified (`role = 'worker'`, not `new_worker`),
    not on leave, and not already assigned to another active booking. Admin can
    select 1, 10, or however many are needed. Submitting this:
    1. Creates rows in `booking_assignments`
    2. Moves booking status to `assigned`
    3. Fires the notification (see §8) to every assigned worker

### 5.3 Worker Management (left sidebar → "Workers")
- Summary counts: Total workers, On leave, Unassigned (available right now)
- **Verify Worker** tab: list of `new_worker` self-registrations awaiting approval.
  Admin reviews and promotes to `worker`, or rejects.
- **Add Worker** form (admin adds someone directly — e.g. from a known worker who
  isn't tech-savvy enough to self-register): Name, Phone Number, **Home Address**,
  Gender, "Has bike" (yes/no). **No OTP is sent for this path** — the admin is vouching for
  the number, and the role is set to `worker` immediately, skipping `new_worker`.
  Double-check the phone number is correct here since notifications depend on it.

---

## 6. Worker Flow

Two ways to become a worker:

**A. Self-registration** (from the public site's secondary link)
1. Enter mobile number → OTP (SMS for MVP; WhatsApp OTP possible later)
2. Registration form: Name, **Home Address**, Gender
3. Account created with `role = 'new_worker'` → sees a "pending verification" screen
   on login until an admin approves them

**B. Admin adds them directly** (§5.3) — immediately `role = 'worker'`, no OTP, no
pending state.

Once verified/active:
- Simple worker dashboard: profile, and an **Active / On Leave** toggle.
  Default is **Active**. Don't hard-restrict changing this to a 7–8am window — send
  a daily ~7am reminder notification nudging workers to confirm their status for the
  day, but let the toggle be changed any time (a worker who falls sick at 11am still
  needs to be able to mark themselves unavailable).
- Job notifications arrive via SMS/WhatsApp with the job details directly — the MVP
  does not require a worker to log into an app to see or accept a job. This is
  intentional given the target users may be on basic phones with limited data;
  keep the in-app worker experience minimal for now.

---

## 7. Booking Status — State Machine

```
pending  (customer submits; admin hasn't acted yet)
   │
   ├──► rejected            (admin declines)
   │
   ▼
accepted  (admin accepted, no workers assigned yet)
   │
   ▼
assigned  (1+ workers assigned & notified)
   │
   ▼
in_progress  (work has started — admin marks this, or Phase 2: worker confirms)
   │
   ▼
completed

Any state before `completed` can also move to `cancelled`
(farmer cancels, or admin cancels for operational reasons).
```

Write every transition to `booking_status_history` — you'll need the trail for
disputes ("no one told me the work was cancelled") and for admin reporting later.

---

## 8. Notification Strategy — SMS vs WhatsApp

**Neither channel is free in 2026** — that changed. Meta removed WhatsApp's monthly
free-conversation tier this year; authentication and utility template messages are
now billed from the first message (India rates are still low, roughly $0.001–0.003
per message, but not zero). Setting up WhatsApp also requires Meta Business
verification and template approval before you can send anything.

**Recommendation for MVP: plain SMS via MSG91.**
- Cost in India runs about ₹0.15/SMS via MSG91 — meaningfully cheaper and simpler
  to set up than Twilio (~₹0.45/SMS for India) or a WhatsApp Business integration.
- SMS doesn't require the recipient to have a smartphone/data connection, which
  matters for field labor.
- **Important compliance note:** any commercial/transactional SMS to Indian numbers
  requires DLT (Distributed Ledger Technology) registration with TRAI, regardless
  of provider. This is a one-time setup step (MSG91 typically assists with it) —
  budget a few days for template + sender-ID approval before launch, not a same-day thing.

**Phase 2: add WhatsApp** once volume/UX justifies the extra setup — richer messages
(farm location as a map link, photos) work better there. MSG91 also offers a bundled
WhatsApp API if you want one vendor for both channels. Re-verify current pricing
before committing — these rates shift often; check msg91.com and business.whatsapp.com
directly at build time.

**Notification trigger points:**
- Worker assigned to a booking → SMS immediately with: work type(s), farm address,
  start date, expected duration, farmer's contact number.
- (Phase 2) Daily 7am "confirm your availability" reminder to active workers.
- (Phase 2) Booking cancelled → SMS to any already-assigned workers.

---

## 9. Database Schema (Postgres / Supabase)

```sql
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
  is_on_leave boolean default false,       -- admin/live override; daily worker choice lives in worker_daily_availability
  added_by_admin uuid references profiles(id), -- null if self-registered
  verified_at timestamptz,                 -- null until admin verifies (self-reg path)
  verified_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ========== DAILY WORKER AVAILABILITY ==========
-- One decision per worker per calendar day. The worker can set this only during
-- 07:00–07:30 local time; admin can override at any time.
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

-- ========== WORKER LEAVE PERIODS (for accurate weekly payroll counts) ==========
-- One row per leave stretch for historical/admin leave periods.
-- Daily worker availability decisions are stored in worker_daily_availability.
-- Keep this table for leave-period history and payroll/reporting where needed.
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
-- Counts calendar days within an active/completed assignment's date range that fall
-- in the given week, minus any days that overlap a leave period. Unassigned days are
-- never counted since they're not in any assignment's range to begin with.
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
```

### Required constraints, indexes, and transactional rules

The logical schema above must also be implemented with:

- Unique `(booking_id, worker_id)` on `booking_assignments`.
- Indexes supporting worker assignment and booking dashboard queries, especially
  `booking_assignments(worker_id, booking_id)` and `bookings(start_date, status)`.
- Checks: `farm_size_acres > 0`, `expected_duration_days > 0`, and
  `estimated_workers_needed` is null or `> 0`.
- Treat the inclusive work end date consistently as
  `start_date + expected_duration_days - 1`.
- Reject assignment when the worker has an overlapping `assigned`/`in_progress`
  booking or a leave period overlapping the requested work period.
- Booking status changes and `booking_status_history` inserts must be atomic.
- Worker availability changes and `worker_leave_periods` open/close operations must
  be atomic.
- Notification sends must be retry-safe/idempotent so assignment retries do not create
  duplicate worker messages.

### Schema notes
- `booking_assignments` is a proper join table specifically so a booking can have
  **1 to N workers** — never collapse this into a single `worker_id` column on `bookings`.
- `workers.is_on_leave` is the live "right now" flag used for assignment eligibility.
  `worker_leave_periods` is the historical record used to calculate payroll — every
  time the flag flips on, open a leave period row; every time it flips off, close the
  most recent open one. Keep both in sync in the same server action/transaction.
- "Unassigned worker" is **derived**, not stored: a verified worker who is not on
  leave for the relevant work dates and has no `assigned`/`in_progress` booking whose
  work period overlaps the booking being considered. Do not treat every active
  assignment as making a worker unavailable forever.
- Assignment eligibility must be re-checked server-side in one transaction immediately
  before inserting `booking_assignments`; UI filtering alone is not a security/business
  rule.

---

## 10. Row Level Security — Summary

Enable RLS on every table above before wiring up any client query.

RLS is the database security boundary. Sensitive multi-row mutations such as
accept/reject, worker assignment, worker verification, and leave changes should be
performed through authenticated server actions or database RPCs that re-check
authorization and business rules.

| Table | Customer | Worker | Admin |
|---|---|---|---|
| `profiles` | read/update own row | read/update own row | full access |
| `bookings` | CRUD own bookings only | read bookings they're assigned to | full access |
| `booking_assignments` | read assignments on own bookings | read own assignment rows | full access |
| `workers` | read limited public fields (name, has_bike) of assigned workers only | update own row | full access |
| `notification_log` | no access | no access | full access (for delivery debugging) |
| `worker_daily_availability` | no access | read/update own daily record only during 07:00–07:30 | full access |

---

## 10A. Authentication & Authorization

- Supabase Auth is the identity source; `profiles.id` equals `auth.users.id`.
- Customer and self-registering worker login use phone OTP.
- MVP OTP/notification delivery is SMS. Do not assume Supabase can send WhatsApp OTP
  directly; WhatsApp authentication is a separate integration.
- Admin is not self-registering and must be created through a secure server-side setup.
- Authorization comes from `profiles.role`, enforced in middleware and server-side
  data access. Never trust a role supplied by the browser.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.
- Server actions derive the authenticated user from the server Supabase client instead
  of accepting a user id from browser input.

## 11. Route Structure (Next.js App Router)

```
app/
├── (public)/
│   └── page.tsx                     # landing page — grape photos, customer login CTA
├── (auth)/
│   ├── login/page.tsx
│   └── verify-otp/page.tsx
├── (customer)/
│   ├── register/page.tsx
│   ├── dashboard/page.tsx
│   ├── bookings/new/page.tsx
│   ├── bookings/[id]/page.tsx
│   └── bookings/page.tsx            # history
├── (worker)/
│   ├── register/page.tsx
│   ├── pending-verification/page.tsx
│   └── dashboard/page.tsx           # profile + availability toggle
├── (admin)/
│   ├── login/page.tsx               # NOT linked from public site
│   ├── dashboard/page.tsx
│   ├── bookings/page.tsx
│   ├── bookings/[id]/page.tsx       # accept/reject/assign
│   ├── workers/page.tsx
│   └── workers/verify/page.tsx
└── middleware.ts                     # role-based route guard

lib/
├── supabase/                          # browser/server clients
├── validations/                       # shared Zod schemas
└── permissions/                       # server-side authorization helpers

app/api/
├── notifications/                     # provider/webhook boundary when required
└── auth/                              # only for provider callbacks when required
```

Prefer Server Components for reads and Server Actions for authenticated mutations.
Use route handlers only when a genuine HTTP boundary is required (webhooks, provider
callbacks, or external integrations). Do not create an Axios REST layer merely for
internal CRUD.

---

## 11A. Important MVP UX Rules

- Booking detail shows farmer name/phone, farm address, farm size, crop, work types,
  start date, duration, requested worker count, status, assigned workers, and status history.
- Customer history is read-only and shows status plus key booking details.
- Admin booking lists support status and start-date filtering.
- Worker list supports name/phone search and the weekly days-worked count.
- Assignment UI supports bulk multi-select; it is not a one-worker-at-a-time flow.
- Mobile-first design is important for farmers and workers.
- Worker UI remains minimal: profile + daily availability window, while job details
  arrive by SMS.
- Worker availability control is enabled only from **07:00–07:30** local time. Outside
  the window, show the current day's status as read-only.
- "Book your slot" opens the normal booking form. Do not build a slot-inventory engine
  until the business defines real capacity/time-slot rules.

## 11B. Daily Worker Availability Rules

For each worker and calendar date:

1. Default state before the worker makes a choice is `available`.
2. From **07:00:00 through 07:29:59 local time**, the worker may set/update that day's
   status to `available` or `leave`.
3. At **07:30:00**, the worker control becomes read-only for that date.
4. Admin can override the worker's status at any time.
5. The server, not the browser clock, enforces the 7:00–7:30 window.
6. Assignment eligibility must use the availability for the booking's work dates.
7. If a worker has no daily record for a date, treat them as `available` unless an
   admin leave period/override makes them unavailable.
8. Use one canonical application timezone for this business rule (configured as an
   environment setting); never rely on each browser's local timezone.
9. A daily availability update should be transactional and idempotent via the unique
   `(worker_id, availability_date)` constraint.

## 12. Recommendations & Open Questions

Flagging these now so they don't turn into schema rework later:

1. ~~Farm address vs. home address~~ — **Resolved:** customer profile collects farm
   address only (no separate home address); worker/admin profiles collect home
   address. See §4 and §6. Assumption baked in: one farm per customer account —
   revisit if a farmer might need to book work across multiple plots.
2. **Rejecting an assigned worker mid-job** — what happens if a worker no-shows
   after being assigned? Recommend an admin action to remove/replace a single
   worker on an already-assigned booking without cancelling the whole booking.
3. ~~Multiple admins~~ — **Resolved (deferred):** single admin account for MVP;
   granular admin permissions are planned — see §15.
4. **Worker-side confirmation** — MVP notifies workers by SMS but doesn't require
   them to accept/reject in-app. Worth revisiting in Phase 2: a missed/rejected
   job currently has no signal back to admin unless the worker calls.
5. ~~Payment/rate tracking~~ — **Partially resolved:** pay cycle is weekly,
   Friday-to-Friday (see §14). Still open: the actual per-day/per-job rate and
   whether payout amounts are tracked in-app or handled outside the system.
6. **Daily worker availability window** — the MVP now requires a worker to choose
   available/leave only during 07:00–07:30; server-side time-window enforcement and
   the business timezone must be configured before production.
7. **DLT + template approval lead time for SMS** — start this registration process
   in parallel with development, not after — it can take several business days
   and will block your first real OTP send otherwise.

---

## 14. Worker Payroll — Weekly Attendance

Workers are paid **weekly, Friday to Friday** (a pay week runs Friday through the
following Thursday; payout happens on Friday for the week just completed).

### Worker listing page — required column
Each row in the admin's worker list needs a **days-worked-this-pay-week** count,
computed with `worker_days_worked()` (§9) — this **excludes leave days and days
the worker wasn't assigned to anything**, so the number reflects actual billable
work only.

Example row layout:

| Name | Days worked (this week) | Status | Action |
|---|---|---|---|
| Onkar Doke | 5 | 🟢 Active | Set Inactive |
| ... | ... | 🟡 On Leave | Set Active |

- Name — left-aligned
- Days worked — from `worker_days_worked(worker.id, current_pay_week_start)`
- Status badge — reflects `workers.is_on_leave`
- Action button — lets the **admin** flip a worker's status directly (not just the
  worker themselves). Toggling this must also open/close a row in
  `worker_leave_periods` so the days-worked count stays accurate — don't just
  flip the boolean on `workers` without updating the leave-period history.

This view is a read model for payroll, not the payroll system itself — it tells
the admin how many days to pay for; it doesn't calculate or record the amount
(see open question #5 in §12).

---

## 15. Future: Granular Admin Permissions

Not needed for MVP (single admin account is fine to start), but documenting the
intended shape now so it's a clean add later rather than a retrofit.

Planned permission set, assignable independently per admin account:
- `verify_worker` — access to the new-worker verification queue
- `verify_booking` — access to the new-booking (unaccepted) queue and accept/reject action
- `add_worker` — access to the "Add Worker" page
- `assign_worker` — access to the assign-workers action on a booking

A **"Worker Admin"** role, when introduced, would just be a preset bundle of
`verify_worker` + `add_worker` — a convenience checkbox when creating an admin
account, not a hardcoded role. Suggested schema for when this is built:

```sql
create table admin_permissions (
  admin_id uuid references profiles(id) on delete cascade,
  permission text not null check (permission in (
    'verify_worker', 'verify_booking', 'add_worker', 'assign_worker'
  )),
  primary key (admin_id, permission)
);
```

Do not build this table or any UI for it in Phase 1 — it's here so the eventual
migration is additive, not a rework of the existing single-admin flows.

---

## 16. Build Roadmap

**Phase 0 (setup):** Supabase project, schema + RLS above, Next.js scaffold, OTP
auth wired end-to-end for one role first (recommend customer, since it's the
simpler of the two OTP flows).

**Phase 1 (MVP core loop):**
- Customer: OTP login, registration, new booking form, status tracking, history
- Admin: dashboard counts, booking accept/reject, multi-worker assignment, worker
  add/verify flows
- Worker: OTP self-registration + pending-verification gate, admin-add path,
  availability toggle
- Worker listing: days-worked-this-pay-week column + admin active/inactive override (§14)
- Notifications: SMS only, via MSG91, on assignment

**Phase 2:**
- WhatsApp notifications alongside/instead of SMS
- Worker in-app accept/reject + status confirmation
- Daily availability reminder (7am)
- Basic analytics for admin (bookings over time, worker utilization)

**Phase 3:**
- Second crop support (data already models this — mostly UI work)
- Rate/payout tracking (actual ₹ amounts, not just day counts)
- Worker replacement/reassignment on an active booking
- Granular admin permissions / multiple admin accounts (§15)
