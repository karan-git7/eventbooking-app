# EventBook

A mini full-stack event booking platform built for the internship assessment.

---

## 1. Live Links & Test Accounts

- **Frontend**: [https://eventbooking-app-nine.vercel.app](https://eventbooking-app-nine.vercel.app)
- **Backend API**: [https://eventbooking-app.onrender.com](https://eventbooking-app.onrender.com)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@gmail.com` | `admin@123` |
| **User** | `karan@gmail.com` | `karan@123` |

> *Note: Render free tier spins down after inactivity. The first API request may take ~30 seconds to wake up.*

---

## 2. Tech Stack & Why Chosen

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
  - Clean component-based UI, fast page loads, responsive design across mobile and desktop.
- **Backend**: Node.js, Express.js
  - Lightweight, decoupled REST API following standard MVC structure.
- **Database**: PostgreSQL (hosted on Supabase)
  - Enforces relational constraints, ACID transactions, and row-level locking for concurrency.
- **Testing**: Jest + Supertest
  - Automated integration testing of core business and booking rules.

---

## 3. Run Locally

### Prerequisites
- Node.js 18+
- Supabase / PostgreSQL instance

### Setup
```bash
git clone https://github.com/karan-git7/eventbooking-app.git
cd eventbooking-app

# Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Environment Variables

**`backend/.env`**:
```env
PORT=5000
DATABASE_URL=your_supabase_postgres_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

**`frontend/.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Database Migration & Seed
```bash
cd backend
npm run migrate   # Creates tables, constraints, and partial index
npm run seed      # Seeds admin, users, and authentic events
```

### Start Application
```bash
# From project root
npm run dev       # Starts backend (:5000) and frontend (:3000)
```

### Run Tests
```bash
cd backend
npm test          # Runs 6 automated backend tests
```

---

## 4. Data Model

- **`users`**: `id` (UUID, PK), `name`, `email` (Unique), `password_hash`, `role` (`user` | `admin`), `created_at`
- **`events`**: `id` (UUID, PK), `title`, `description`, `category`, `date_time`, `venue`, `total_seats` (> 0), `created_by` (FK → users), `created_at`, `updated_at`
- **`booking`**: `id` (UUID, PK), `event_id` (FK → events), `user_id` (FK → users), `status` (`CONFIRMED` | `CANCELLED`), `created_at`, `updated_at`

### Key Constraint
```sql
CREATE UNIQUE INDEX idx_unique_active_booking
ON booking (event_id, user_id)
WHERE status = 'CONFIRMED';
```
Enforces at the database level that a user cannot hold two active seats for the same event, while still allowing re-booking if previously cancelled.

---

## 5. API Endpoints

### Auth
- `POST /api/auth/register` — Public. Creates account (`role` is hardcoded to `'user'`).
- `POST /api/auth/login` — Public. Rate limited (15 req/15 min). Returns JWT token.
- `GET /api/auth/me` — Authenticated. Returns current user profile.

### Events
- `GET /api/events` — Public. Server pagination (`page`, `limit`), search query (`search`), filter (`upcoming`, `past`, `all`). Computes real-time `seats_left`.
- `GET /api/events/:id` — Public. Full event details + user booking status.
- `POST /api/events` — Admin only. Creates an event (future date and positive seat count required).
- `PUT /api/events/:id` — Admin only. Edits event (rejects decreasing seats below active bookings).
- `DELETE /api/events/:id` — Admin only. Soft/hard delete protection (`?force=true` to cancel active bookings).
- `GET /api/events/:id/attendees` — Admin only. Lists confirmed attendees with names and emails.

### Bookings
- `POST /api/events/:id/book` — Authenticated. Books 1 seat using row locking.
- `GET /api/bookings/my` — Authenticated. Lists logged-in user's bookings.
- `POST /api/bookings/:id/cancel` — Authenticated. Cancels booking and frees up seat (blocked if event has passed).

*Errors consistently return `{ "error": "message" }` with standard HTTP status codes (400, 401, 403, 404, 409, 500).*

---

## 6. Key Decisions & Trade-offs

1. **Concurrency & Overbooking Prevention**: Handled inside a database transaction with `SELECT ... FOR UPDATE` on the event row. Requests are serialized, preventing race conditions when the last seat is being booked.
2. **Real-time Seat Count**: `seats_left` is computed via `COUNT(*)` of active bookings rather than a mutable counter column to prevent counter drift.
3. **Edge Case Handling**:
   - Past events cannot be booked or cancelled.
   - Admin cannot reduce total seats below already confirmed bookings.
   - Admin account can only be created via seed script — registration route strictly forces `role = 'user'`.

---

## 7. AI Usage

- Used an AI coding assistant for:
  - Scaffolding initial boilerplate (Express route skeletons, Tailwind layouts).
  - Generating initial mock event data for the seed script.
  - Quick syntax assistance and TypeScript typing.
- All core architecture decisions, concurrency locks (`SELECT ... FOR UPDATE`), partial indexes, business rule validations, and edge cases were reviewed, verified, and tested manually.

---

## 8. Known Issues & Next Steps

- **Cold Starts**: Render free tier sleeps after 15 minutes of inactivity; the initial request takes ~30s.
- **Email Notifications**: Currently no confirmation emails sent upon booking or cancellation.
- **Payment Gateway**: All bookings are free reservation seats; paid ticketing integration would be a next step.
