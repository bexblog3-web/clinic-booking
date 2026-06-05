# OPERATIONS.md — Clinic Booking System

## Environment Variables (Vercel)

Set these in the Vercel dashboard under Project > Settings > Environment Variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `JWT_SECRET` | Secret for signing patient JWTs (min 32 chars) |
| `ADMIN_KEY_STAFF` | Admin API key for staff (all departments) |
| `ADMIN_KEY_ORTHO` | Admin API key for orthopedics department only |
| `ADMIN_KEY_ENT` | Admin API key for ENT department only |
| `RESEND_API_KEY` | Resend API key for confirmation emails |

## Admin API Keys

- `ADMIN_KEY_STAFF` — full access: can read all bookings and update settings
- `ADMIN_KEY_ORTHO` — restricted to `orthopedics` department only
- `ADMIN_KEY_ENT` — restricted to `ent` department only

Pass as HTTP header: `x-admin-key: <key>`

## API Endpoints

### Authentication
- `POST /api/auth` — patient login (phone + birthdate), returns `patient_token` cookie
- `GET /api/auth/me` — get current patient info (requires `patient_token` cookie)
- `POST /api/auth/logout` — clear `patient_token` cookie

### Bookings
- `GET /api/bookings` — list bookings (admin: today's queue; patient: own history)
- `POST /api/bookings` — create booking (patient auth required)
- `PATCH /api/bookings` — update booking status (admin key required)

### Admin
- `POST /api/admin/walkin` — register walk-in patient (admin key required)
- `POST /api/admin/checkin` — check in a waiting patient (admin key required)
- `POST /api/admin/call-next` — call next patient in queue (admin key required)
- `GET/POST /api/admin/auth` — admin password login

### Settings & Departments
- `GET /api/settings` — get clinic settings (admin key required)
- `PUT /api/settings` — update clinic settings (staff key only)
- `GET /api/departments` — list departments (admin key required)

## Supabase SQL Setup

Run the following in the Supabase SQL editor if not already done:

```sql
-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('open_hour', '8'),
  ('close_hour', '18'),
  ('closed_dates', '[]')
ON CONFLICT (key) DO NOTHING;

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

INSERT INTO departments (name, label) VALUES
  ('orthopedics', '整形外科'),
  ('ent', '耳鼻科')
ON CONFLICT (name) DO NOTHING;
```

## Security Notes

- Patient tokens are signed JWTs (HS256) using `JWT_SECRET`
- Admin keys enforce department isolation (ortho key cannot access ENT data)
- All free-text inputs are HTML-sanitized before storage
- Error responses never expose internal DB error details
- All GET /api/bookings calls require authentication (no unauthenticated access)
