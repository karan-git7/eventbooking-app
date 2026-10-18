# EventBook - Task Execution Log

## Project Overview
- **Project**: EventBook (Mini Event Booking Full Stack App)
- **Frontend**: Next.js + TypeScript + TailwindCSS
- **Backend**: Node.js + Express (REST API)
- **Database**: Supabase (PostgreSQL with `pg` pool)
- **Log Location**: `.log/tasks.md`

---

## Task Breakdown & Roadmap

### Phase 1: Database Architecture & Backend Core
- [x] Test connection to Supabase PostgreSQL database
- [ ] Initialize Git repository at root with proper `.gitignore`
- [ ] Design Database Schema (DDL):
  - `users` table (id, name, email, password_hash, role: 'admin' | 'user', created_at)
  - `events` table (id, title, description, category, date_time, venue, total_seats, created_by, created_at, updated_at)
  - `bookings` table (id, event_id, user_id, status: 'CONFIRMED' | 'CANCELLED', created_at, updated_at)
  - Partial Unique Index: `(event_id, user_id) WHERE status = 'CONFIRMED'` to enforce 1 active seat per user at DB level
  - Check constraints: `total_seats > 0`
- [ ] Build migration / table initialization script (`backend/scripts/migrate.js`)
- [ ] Build Seed script (`backend/scripts/seed.js`):
  - Admin user (`admin@eventbook.com` / `AdminPass123!`)
  - Regular user (`user@eventbook.com` / `UserPass123!`)
  - Test user 2 (`user2@eventbook.com` / `UserPass123!`)
  - Sample events:
    - Tech Workshop (upcoming, plenty of seats)
    - Full-stack Meetup (upcoming, nearly full: 1 seat left)
    - Sold-out Music Concert (0 seats left)
    - Past Web3 Conference (past event to verify rules)

### Phase 2: REST API Implementation with Business Rules
- [ ] JWT Authentication & Authorization Middleware (`authMiddleware`, `adminMiddleware`)
- [ ] Auth Routes:
  - `POST /api/auth/register` (hashes password with bcrypt, strictly assigns role 'user')
  - `POST /api/auth/login` (verifies credentials, issues JWT)
  - `GET /api/auth/me` (returns current user profile)
- [ ] Event Routes:
  - `GET /api/events` (paginated, search by title, server-side pagination, dynamic `seats_left`)
  - `GET /api/events/:id` (single event details + `seats_left` + user booking status)
  - `POST /api/events` (admin only, validates future date, positive seats)
  - `PUT /api/events/:id` (admin only, cannot reduce seats below confirmed bookings)
  - `DELETE /api/events/:id` (admin only, handles edge cases for existing bookings)
  - `GET /api/events/:id/attendees` (admin only, lists confirmed attendees)
- [ ] Booking Routes:
  - `POST /api/events/:id/book` (atomic Postgres transaction with `SELECT ... FOR UPDATE` row locking to prevent race conditions and overbooking)
  - `GET /api/bookings/my` (user's bookings with event info)
  - `POST /api/bookings/:id/cancel` (user cancels own booking, frees seat, rejects if event is past)

### Phase 3: Automated Backend Tests
- [ ] Setup Jest / Supertest for automated tests
- [ ] Test 1: Booking rules & overbooking prevention (rule 2)
- [ ] Test 2: Double booking prevention unless cancelled (rule 1)
- [ ] Test 3: Past event booking & cancellation rejected (rule 3)
- [ ] Test 4: Role-based access control (admin route access by normal user is rejected - rule 6)
- [ ] Test 5: Seat reduction below active bookings rejected (rule 5)

### Phase 4: Frontend Development (Next.js + TypeScript + TailwindCSS)
- [ ] Design System & Global Styles: modern typography, dark slate theme, polished cards, animations
- [ ] API Client & Authentication Context (`AuthContext` with login/logout/user state, token storage)
- [ ] Components:
  - Navbar with responsive mobile menu & user profile dropdown
  - Event Card with seats badge, category tag, countdown/date, search & pagination controls
  - Event Details Modal / Page with booking action and real-time seat indicator
  - User Dashboard: "My Bookings" with active & cancelled tabs, cancel confirmation
  - Admin Dashboard: "Event Management", Create/Edit Event Modal, Attendee List Drawer
  - Toast notification system for feedback (errors, successes)
  - Loading skeletons & empty states for all views

### Phase 5: Verification & Edge Cases
- [ ] Verify all 6 backend rules via API calls and automated tests
- [ ] Verify frontend responsive design (mobile, tablet, desktop)
- [ ] Check `.env.example` files created and `.env` ignored
- [ ] Document everything in a thorough, professional `README.md`
- [ ] Verify deployment readiness (Vercel frontend, Render/Railway backend)

---

## Current Status
- **Date**: 2026-10-18
- **Phase in progress**: Phase 1 - Architecture & Database setup
- **Database**: Supabase PostgreSQL connected successfully
