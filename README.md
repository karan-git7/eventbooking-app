# EventBook — Mini Event Booking Platform

EventBook is a full-stack event booking application where an administrator publishes events with fixed seat capacities, visitors can browse and search upcoming events, and registered users can book and manage their seats. The platform strictly enforces concurrency controls to guarantee that events can never be overbooked.

---

## 1. Live Links & Test Accounts

- **Frontend URL**: *(Deployable to Vercel/Netlify; local: `http://localhost:3000`)*
- **API URL**: *(Deployable to Render/Railway; local: `http://localhost:5000`)*
- **Database**: Hosted Supabase PostgreSQL cluster

### Seeded Test Accounts
| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@eventbook.com` | `AdminPass123!` | Create, edit, delete events, inspect full attendee rosters |
| **Normal User** | `user@eventbook.com` | `UserPass123!` | Book seats, view personal bookings, cancel own bookings |
| **User 2** | `jane@eventbook.com` | `UserPass123!` | Pre-seeded attendee on nearly full & full events |
| **User 3** | `bob@eventbook.com` | `UserPass123!` | Pre-seeded attendee for testing capacity boundaries |

> **Evaluator Tip**: In the UI, the top navigation features **One-Click Demo Login** buttons ("Normal User" & "Admin") to instantly authenticate with test credentials.

---

## 2. Tech Stack & Architectural Decisions

- **Frontend**: **Next.js 16 (App Router) + TypeScript + Tailwind CSS**
  - *Why*: Fast server-side rendering, strict static typing, and responsive layout primitives.
  - *Constraint observed*: Clean separation of concerns — Next.js functions strictly as the client UI layer. No Next.js API routes or server actions talk to the database. All operations flow through the Express REST API.
- **Backend**: **Node.js + Express (REST API)**
  - *Why*: Lightweight, explicit route handlers and middleware for granular validation, JWT authentication, and transaction control.
- **Database**: **Supabase (PostgreSQL) via `pg` Connection Pool**
  - *Why*: ACID compliance, row-level locking (`SELECT ... FOR UPDATE`), and partial unique indexes for rock-solid concurrency safety.
- **Testing**: **Jest + Supertest**
  - Automated integration tests exercising all 6 core business rules directly against PostgreSQL.

---

## 3. How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Docker & Docker Compose *(optional)*

### Step 1: Clone and Configure Environment Variables
Clone the repository and copy the environment templates:

```bash
# Backend environment
cd backend
cp .env.example .env
# Ensure DATABASE_URL and JWT_SECRET are set in backend/.env

# Frontend environment
cd ../frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Step 2: Install Dependencies & Run Database Migration
```bash
# In backend/
cd backend
npm install
npm run migrate    # Creates tables, partial indexes, and constraints
npm run seed       # Seeds admin, users, and events with test scenarios
```

### Step 3: Run the Automated Backend Tests
```bash
npm test           # Runs Jest test suite verifying all 6 backend rules
```

### Step 4: Start Development Servers
In terminal 1 (Backend API):
```bash
cd backend
npm run dev        # Starts Express server on http://localhost:5000
```

In terminal 2 (Frontend Web App):
```bash
cd frontend
npm install
npm run dev        # Starts Next.js app on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

*(Optional)* **Docker Compose**:
```bash
docker-compose up --build
```

---

## 4. Data Model

The schema uses native PostgreSQL with UUID primary keys and relational foreign keys:

```
┌──────────────────────────┐          ┌───────────────────────────────────┐
│          users           │          │              events               │
├──────────────────────────┤          ├───────────────────────────────────┤
│ id (UUID, PK)            │          │ id (UUID, PK)                     │
│ name (VARCHAR)           │◄────┐    │ title (VARCHAR)                   │
│ email (VARCHAR, UNIQUE)  │     │    │ description (TEXT)                │
│ password_hash (VARCHAR)  │     │    │ category (VARCHAR)                │
│ role (user | admin)      │     │    │ date_time (TIMESTAMPTZ)           │
│ created_at (TIMESTAMPTZ) │     │    │ venue (VARCHAR)                   │
└──────────────────────────┘     │    │ total_seats (INT, CHECK > 0)      │
             ▲                   │    │ created_by (UUID, FK -> users.id) │
             │                   │    │ created_at, updated_at            │
             │                   │    └───────────────────────────────────┘
             │                   │                      ▲
             │                   └──────────────┐       │
             │                                  │       │
             │                 ┌────────────────┴───────┴──────────┐
             │                 │              booking              │
             │                 ├───────────────────────────────────┤
             │                 │ id (UUID, PK)                     │
             │                 │ user_id (UUID, FK -> users.id)    │
             └─────────────────┤ event_id (UUID, FK -> events.id)  │
                               │ status (CONFIRMED | CANCELLED)    │
                               │ created_at, updated_at            │
                               └───────────────────────────────────┘
```

### Schema Integrity & Rules Enforcement:
1. **Partial Unique Index (`idx_unique_active_booking`)**:
   ```sql
   CREATE UNIQUE INDEX idx_unique_active_booking 
   ON booking (event_id, user_id) 
   WHERE status = 'CONFIRMED';
   ```
   - **Enforces Rule 1 at the database layer**: A user cannot have more than one `CONFIRMED` booking for the same event simultaneously.
   - If a booking is cancelled (`status = 'CANCELLED'`), the partial index no longer locks the pair, allowing the user to legitimately re-book if seats are available.
2. **Check Constraints**:
   - `events.total_seats > 0`
   - `users.role IN ('user', 'admin')`
   - `booking.status IN ('CONFIRMED', 'CANCELLED')`

---

## 5. API Design & Endpoints

### Authentication (`/api/auth`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user. **Strictly enforces `role='user'`**. |
| `POST` | `/api/auth/login` | Public | Authenticate user or admin with rate limiting (Bonus). Returns JWT. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile. |

### Events (`/api/events`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | Server-side paginated list with search query (`?search=`), filter (`?filter=upcoming\|past\|all`), and dynamic seat calculations. |
| `GET` | `/api/events/:id` | Public | Get single event details with computed `seats_left` and user booking status. |
| `POST` | `/api/events` | Admin Only | Create event with validation (date in future, total_seats > 0). |
| `PUT` | `/api/events/:id` | Admin Only | Update event. **Enforces Rule 5** (cannot reduce seats below booked count). |
| `DELETE` | `/api/events/:id` | Admin Only | Delete event. Handles active bookings gracefully (requires `?force=true` or cascades). |
| `GET` | `/api/events/:id/attendees`| Admin Only | **Enforces Rule 6**. Lists all users who booked seats. |

### Bookings (`/api`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/:id/book` | Authenticated | **Atomic booking** with row-level locking (`SELECT ... FOR UPDATE`). Enforces Rules 1, 2, 3. |
| `GET` | `/api/bookings/my` | Authenticated | Fetch current user's bookings with event info. |
| `POST` | `/api/bookings/:id/cancel` | Authenticated | Cancel own booking. Frees seat. Enforces Rules 3, 4. |

---

## 6. Decisions & Trade-Offs

### 1. Dynamic Seat Calculation vs. Counter Column
- **Decision**: We compute `seats_left = total_seats - COUNT(booking WHERE status='CONFIRMED')` dynamically via SQL joins on query time, combined with row locking on write time.
- **Why**: Maintaining a redundant `booked_seats` counter column creates cache invalidation and drift bugs under network latency or manual DB edits. Computing directly from the canonical `booking` table guarantees 100% truth at all times.

### 2. Concurrency Safety & Race Condition Prevention (Bonus #1)
- **Problem**: Two users attempting to book the last remaining seat at the exact same millisecond.
- **Solution**: Inside the booking transaction:
  ```sql
  BEGIN;
  SELECT id, total_seats, date_time FROM events WHERE id = $1 FOR UPDATE;
  ...
  SELECT COUNT(*) FROM booking WHERE event_id = $1 AND status = 'CONFIRMED';
  ...
  COMMIT;
  ```
  `SELECT ... FOR UPDATE` acquires an exclusive row lock on the target event. Concurrent booking transactions are queued and serialized. The second transaction reads the newly committed seat count, sees `bookedCount >= total_seats`, and receives a clean `400 Bad Request: "Event is fully booked"`.

### 3. Edge Case: Deleting an Event with Active Bookings
- **Decision**: If an admin attempts to delete an event that already has active confirmed attendees, the API rejects the request with a `400 Bad Request` unless an explicit `?force=true` parameter is passed. When confirmed with `force=true`, all active attendee bookings are atomically transitioned to `CANCELLED` before the event is deleted, providing a clean audit trail.

### 4. Admin Role Escalation Defense
- In `POST /api/auth/register`, client input `role` is discarded. The SQL query explicitly hardcodes `'user'`. Admin accounts can only be provisioned through server seed scripts or secure migrations.

---

## 7. Automated Test Suite

We implemented an automated test suite with Jest and Supertest (`backend/tests/rules.test.js`) verifying all backend rules:

- **Test 1 (Rule 2 & Concurrency)**: Verifies that events cannot be overbooked beyond capacity.
- **Test 2 (Rule 1)**: Verifies that a user cannot book the same event twice, but is allowed to re-book once earlier booking is cancelled.
- **Test 3 (Rule 3)**: Verifies that past events cannot be booked and bookings for past events cannot be cancelled.
- **Test 4 (Rule 4)**: Verifies that users cannot cancel bookings belonging to other users.
- **Test 5 (Rule 5)**: Verifies that an admin cannot reduce total seats below the active confirmed bookings count.
- **Test 6 (Rule 6)**: Verifies that non-admin users calling admin endpoints (event creation, attendee lists) are rejected with `403 Forbidden`.

To run all tests:
```bash
npm --prefix backend test
```

---

## 8. AI Tools Disclosure

As required by Section 8 of the project brief:
- **AI Tools Used**: Claude / Gemini inside Antigravity IDE.
- **Usage Scope**:
  - Drafting PostgreSQL migration scripts and partial index syntax.
  - Generating test scenarios for the seed script (nearly full, sold out, past events).
  - Writing automated Jest/Supertest assertions.
  - Designing UI layout components in React/Tailwind.
- **Code Ownership**: Every architecture decision (PostgreSQL row locks, partial unique index, server-side pagination, centralized error handling) was vetted, debugged, and verified through automated test runs.

---

## 9. Submission Checklist (Self-Check)

- [x] Register, login, booking, and cancelling all work seamlessly.
- [x] Booking twice, booking a full event, and booking a past event all fail with clear messages.
- [x] Calling admin APIs as a normal user (via Postman or code) returns `403 Forbidden`.
- [x] Search by title and server-side pagination work.
- [x] `.env` is ignored by git; `.env.example` is committed.
- [x] Automated tests pass with `npm test`.
- [x] Docker Compose configured for local containerized development.
- [x] Rate limiting enabled on login.
