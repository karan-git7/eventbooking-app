# EventBook — Mini Event Booking Platform

EventBook is a full-stack event booking application where an administrator publishes events with fixed seat capacities, visitors can browse and search upcoming events, and registered users can book and manage their seats. The platform strictly enforces concurrency controls to guarantee that events can never be overbooked.

---

## 1. Live Links & Test Accounts

- **Frontend URL**: *(Deployable to Vercel/Netlify; local: `http://localhost:3000`)*
- **API URL**: *(Deployable to Render/Railway; local: `http://localhost:5000`)*
- **Database**: Hosted Supabase PostgreSQL cluster

### Test Accounts
| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@gmail.com` | `admin@123` | Create, edit, delete events, inspect attendee rosters |
| **User (Karan)** | `karan@gmail.com` | `karan@123` | Book seats, view personal bookings, cancel own bookings |
| **User 2 (Jane)** | `jane@gmail.com` | `karan@123` | Pre-seeded attendee on nearly full & full events |
| **User 3 (Bob)** | `bob@gmail.com` | `karan@123` | Pre-seeded attendee for testing capacity boundaries |

---

## 2. Tech Stack & Architectural Decisions

- **Frontend**: **Next.js 16 (App Router) + TypeScript + Tailwind CSS**
  - Clean separation of concerns — Next.js functions strictly as the client UI layer. No Next.js API routes or server actions talk to the database. All operations flow through the Express REST API.
- **Backend**: **Node.js + Express (REST API)**
  - Modular route handlers, JWT authentication, centralized error handling, and transaction controls.
- **Database**: **Supabase (PostgreSQL) via `pg` Connection Pool**
  - ACID compliance, row-level locking (`SELECT ... FOR UPDATE`), and partial unique indexes for rock-solid concurrency safety.
- **Testing**: **Jest + Supertest**
  - Automated integration tests exercising all 6 core business rules directly against PostgreSQL.

---

## 3. How to Run Locally

### Step 1: Install Dependencies & Run Database Migration
```bash
# In project root
npm run migrate    # Creates tables, partial indexes, and constraints
npm run seed       # Seeds admin, users, and events with test scenarios
```

### Step 2: Start Development Servers
From the root folder, run:
```bash
npm run dev        # Starts both backend (port 5000) and frontend (port 3000) concurrently
```

Open `http://localhost:3000` in your browser.

### Step 3: Run Automated Tests
```bash
npm test           # Runs Jest test suite verifying all 6 backend rules
```

---

## 4. Manual Self-Test Checklist (Run Before Submitting)

Follow these quick verification steps on the running app:

### 1. Visitor Experience (Not Logged In)
- [ ] Open `http://localhost:3000`. Dismiss the test account guide by clicking outside.
- [ ] Search for an event by typing in the search bar (e.g. "Docker" or "Next.js") — verify the list filters in real-time.
- [ ] Toggle filter tabs: **Upcoming**, **All Events**, **Past Events**.
- [ ] Notice the seat badges:
  - *Acoustic Rooftop Session*: Shows **"Only 1 seat left"**
  - *Docker Masterclass*: Shows **"Sold Out"**
  - *Autumn Tech Retrospective*: Shows **"Past Event"**
- [ ] Click **"Details"** on any event to view the full description and venue.
- [ ] Click **"Book Seat"** while logged out — verify you are prompted to sign in.

### 2. User Authentication & Booking Rules
- [ ] Sign in with `karan@gmail.com` / `karan@123`.
- [ ] Book a seat on an upcoming event with available seats (e.g. *Next.js Workshop*):
  - Verify seat count decrements immediately and button changes to **"Booked"**.
- [ ] Try to book the same event again:
  - Verify it is rejected with a clear message: *"You have already booked a seat for this event"*.
- [ ] Try to book the **Sold Out** event (*Docker Masterclass*):
  - Verify booking is disabled / rejected.
- [ ] Try to book the **Past Event** (*Autumn Retrospective*):
  - Verify booking is disabled / rejected.

### 3. Personal Bookings & Cancellation
- [ ] Click **"My Bookings"** in the top navigation bar.
- [ ] Verify your active bookings are displayed.
- [ ] Click **"Cancel Booking"** on an active booking:
  - Confirm the prompt. Verify the booking status changes to **"Cancelled"** and the event's available seats increase by 1.
- [ ] Re-book the same event after cancelling — verify that re-booking is now permitted.
- [ ] Verify you cannot cancel a booking for a past event.

### 4. Admin Management & Access Control
- [ ] Log out, then log in as Admin (`admin@gmail.com` / `admin@123`).
- [ ] Notice the **"Admin Panel"** button appears in the navigation bar.
- [ ] Click **"Admin Panel"**:
  - Click **"Create Event"** and fill in title, venue, future date, and capacity (e.g. 20 seats). Verify it appears on the home page.
  - Click the **Users icon** on any event to view the **Attendee Roster** (lists attendee names, emails, and booking dates).
  - Click **Edit** on an event that has active bookings (e.g. 2 bookings) and try reducing `total_seats` to `1`:
    - Verify backend rejects the update: *"Cannot reduce total seats to 1. There are already 2 active confirmed bookings"*.
- [ ] Log out from Admin, log in as Karan, and try accessing admin endpoints via curl / Postman:
  - `POST http://localhost:5000/api/events` with Karan's token returns `403 Forbidden: Administrator privileges required`.

---

## 5. Data Model

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

### Partial Unique Index (`idx_unique_active_booking`)
```sql
CREATE UNIQUE INDEX idx_unique_active_booking 
ON booking (event_id, user_id) 
WHERE status = 'CONFIRMED';
```
- A user cannot have more than one `CONFIRMED` booking for the same event simultaneously.
- If a booking is cancelled (`status = 'CANCELLED'`), the partial index frees the constraint, allowing the user to legitimately re-book if seats are available.

---

## 6. API Design & Endpoints

### Authentication (`/api/auth`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user. Strictly forces `role='user'`. |
| `POST` | `/api/auth/login` | Public | Authenticate user or admin with rate limiting. Returns JWT. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile. |

### Events (`/api/events`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | Server-side paginated list with search query (`?search=`), filter (`?filter=upcoming\|past\|all`), and dynamic seat calculations. |
| `GET` | `/api/events/:id` | Public | Get single event details with computed `seats_left` and user booking status. |
| `POST` | `/api/events` | Admin Only | Create event with validation (date in future, total_seats > 0). |
| `PUT` | `/api/events/:id` | Admin Only | Update event. Enforces Rule 5 (cannot reduce seats below booked count). |
| `DELETE` | `/api/events/:id` | Admin Only | Delete event. Handles active bookings gracefully (requires `?force=true` or cascades). |
| `GET` | `/api/events/:id/attendees`| Admin Only | Enforces Rule 6. Lists all users who booked seats. |

### Bookings (`/api`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/:id/book` | Authenticated | Atomic booking with row-level locking (`SELECT ... FOR UPDATE`). Enforces Rules 1, 2, 3. |
| `GET` | `/api/bookings/my` | Authenticated | Fetch current user's bookings with event info. |
| `POST` | `/api/bookings/:id/cancel` | Authenticated | Cancel own booking. Frees seat. Enforces Rules 3, 4. |

---

## 7. Decisions & Trade-Offs

1. **Dynamic Seat Calculation vs. Counter Column**:
   - `seats_left` is calculated dynamically via SQL joins on query time, combined with row locking on write time. This avoids out-of-sync cache invalidation bugs.
2. **Concurrency Safety & Race Condition Prevention**:
   - Inside the booking transaction, `SELECT id, total_seats, date_time FROM events WHERE id = $1 FOR UPDATE` acquires an exclusive row lock on the target event. Concurrent booking transactions are queued and serialized, preventing overbooking.
3. **Event Deletion Edge Case**:
   - If an admin deletes an event with active bookings, the API requires `?force=true` to confirm cancellation of active attendee seats, ensuring a clear audit trail.
4. **Admin Role Escalation Defense**:
   - In `POST /api/auth/register`, client input `role` is ignored and hardcoded to `'user'`. Admin accounts can only be provisioned through seed scripts.

---

## 8. AI Tools Disclosure

- **AI Tools Used**: Claude / Gemini within Antigravity IDE for drafting initial boilerplate schemas and test assertions.
- **Code Ownership**: Core concurrency logic (`SELECT ... FOR UPDATE`), partial unique database index, and validation middleware were designed, debugged, and verified through automated test suites.
