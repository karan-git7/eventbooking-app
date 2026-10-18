# EventBook

A full-stack event booking platform. Admin publishes events, users browse and book seats, concurrency is handled safely.

---

## Live Links & Test Accounts

- **Frontend**: (to be added after deployment)
- **Backend API**: (to be added after deployment)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@gmail.com | admin@123 |
| User | karan@gmail.com | karan@123 |

The admin account is created only via seed script — it cannot be made through the registration form.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express REST API
- **Database**: Supabase (PostgreSQL) via `pg` connection pool
- **Auth**: JWT (7-day expiry), bcrypt password hashing
- **Tests**: Jest + Supertest

Frontend and backend are fully separate. Next.js only renders the UI — it has no database access. All data flows through the Express API.

---

## Run Locally

**Prerequisites**: Node.js 18+, a Supabase project with the connection string.

**1. Clone and install**
```bash
git clone <repo-url>
cd eventbooking_app
npm install          # installs concurrently at root
cd backend && npm install
cd ../frontend && npm install
```

**2. Set environment variables**

Copy `backend/.env.example` to `backend/.env` and fill in:
```
DATABASE_URL=postgresql://...   # your Supabase connection string
JWT_SECRET=any_long_random_string
PORT=5000
```

Copy `frontend/.env.example` to `frontend/.env.local` and fill in:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**3. Run database migration and seed**
```bash
cd backend
npm run migrate    # creates tables, indexes, constraints
npm run seed       # seeds admin, users, and 8 Nepali events
```

**4. Start both servers**
```bash
# from project root
npm run dev        # starts backend on :5000 and frontend on :3000
```

**5. Run tests**
```bash
cd backend
npm test           # runs 6 backend integration tests
```

---

## Data Model

Three tables:

**users** — id (UUID), name, email (unique), password_hash, role (user | admin), created_at

**events** — id (UUID), title, description, category, date_time, venue, total_seats (>0), created_by (FK → users), created_at, updated_at

**booking** — id (UUID), event_id (FK → events), user_id (FK → users), status (CONFIRMED | CANCELLED), created_at, updated_at

**Partial unique index**:
```sql
CREATE UNIQUE INDEX idx_unique_active_booking
ON booking (event_id, user_id)
WHERE status = 'CONFIRMED';
```
This prevents duplicate active bookings at the database level. A cancelled booking does not block re-booking.

---

## API Endpoints

### Auth
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | /api/auth/register | Public | Create account. Role is always forced to 'user'. |
| POST | /api/auth/login | Public | Login with rate limiting (15 req/15 min). Returns JWT. |
| GET | /api/auth/me | JWT | Get current user profile. |

### Events
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | /api/events | Public | Paginated list. Query params: search, filter (upcoming/past/all), page, limit. Returns seats_left. |
| GET | /api/events/:id | Public | Single event with seats_left and user's booking status. |
| POST | /api/events | Admin | Create event. Validates future date, seats > 0. |
| PUT | /api/events/:id | Admin | Update event. Cannot reduce seats below confirmed booking count. |
| DELETE | /api/events/:id | Admin | Delete event. Pass ?force=true to also cancel active bookings. |
| GET | /api/events/:id/attendees | Admin | List confirmed attendees for an event. |

### Bookings
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | /api/events/:id/book | JWT | Book a seat. Uses SELECT FOR UPDATE to prevent overbooking. |
| GET | /api/bookings/my | JWT | Get current user's bookings. |
| POST | /api/bookings/:id/cancel | JWT | Cancel own booking. Rejected for past events. |

All errors return JSON `{ "error": "..." }`. Stack traces are never sent to the client.

---

## Decisions & Trade-offs

**Seat calculation**: `seats_left` is computed dynamically via a COUNT of confirmed bookings on each query, not stored as a column. This avoids cache/counter drift bugs but adds a small query cost — fine for this scale.

**Overbooking prevention**: Inside a transaction, the booking route does `SELECT ... FOR UPDATE` on the event row. Concurrent requests queue up behind the lock, so only one proceeds at a time. This is serialized at the database level.

**Cancellation edge case**: Cancelling a past event booking is blocked on the backend (checked by comparing event date_time to NOW()). The frontend also hides the cancel button for past events.

**Admin seat reduction**: If an admin tries to reduce total_seats below the number of already confirmed bookings, the API rejects it with a clear error message. This is Rule 5.

**Event deletion with bookings**: Deleting an event that has active bookings requires `?force=true`. This cancels all attendee bookings before deleting the event. Without force=true, deletion is rejected — prevents accidental data loss.

**Admin role security**: The register endpoint hardcodes `role = 'user'` regardless of what the client sends. Admin accounts can only be created via the seed script.

---

## AI Usage

Used Gemini (via Antigravity IDE) as a coding assistant throughout the project.

What I used it for:
- Generating initial boilerplate (table schema, Express route structure)
- Drafting test assertions for the Jest suite
- Fixing TypeScript type errors

What I wrote / verified myself:
- The `SELECT ... FOR UPDATE` concurrency logic and why it works
- The partial unique index design and what it enforces
- The seat calculation approach (dynamic COUNT vs stored counter)
- All business rule validations (Rules 1–6)
- The overall architecture decision to keep Next.js as a pure UI layer

---

## Known Issues / Next Steps

- CORS is currently set to `origin: true` (allow all). Before production, restrict it to the deployed frontend URL.
- No email notifications on booking confirmation or cancellation.
- No admin dashboard analytics (total bookings, revenue, etc.).
- Password reset flow not implemented.
