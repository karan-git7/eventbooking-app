const request = require('supertest');
const app = require('../server');
const pool = require('../db');

jest.setTimeout(30000);

describe('EventBook - Business Rules & Integrity Tests', () => {
  let adminToken = '';
  let user1Token = '';
  let user2Token = '';
  let user1Id = '';
  let user2Id = '';
  let testEventId = '';
  let pastEventId = '';

  beforeAll(async () => {
    // Login as seeded Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@eventbook.com', password: 'AdminPass123!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    // Login as seeded User 1 (Alex)
    const user1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@eventbook.com', password: 'UserPass123!' });
    expect(user1Login.status).toBe(200);
    user1Token = user1Login.body.token;
    user1Id = user1Login.body.user.id;

    // Login as seeded User 2 (Jane)
    const user2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@eventbook.com', password: 'UserPass123!' });
    expect(user2Login.status).toBe(200);
    user2Token = user2Login.body.token;
    user2Id = user2Login.body.user.id;

    // Create a dedicated test event with total_seats = 1
    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Automated Test Micro-Summit',
        description: 'Test event for verifying atomic booking rules and capacity limits.',
        category: 'Testing',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Testing Suite Arena',
        total_seats: 1
      });
    expect(createRes.status).toBe(201);
    testEventId = createRes.body.event.id;

    // Fetch seeded past event
    const pastRes = await pool.query(
      "SELECT id FROM events WHERE date_time < NOW() LIMIT 1"
    );
    if (pastRes.rows.length > 0) {
      pastEventId = pastRes.rows[0].id;
    }
  });

  afterAll(async () => {
    // Clean up created test event
    if (testEventId) {
      await pool.query('DELETE FROM booking WHERE event_id = $1', [testEventId]);
      await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    }
    await pool.end();
  });

  // RULE 2: An event cannot be overbooked
  test('Rule 2 & Concurrency: Event cannot be overbooked beyond capacity', async () => {
    // User 1 books the only seat (total_seats = 1)
    const bookRes1 = await request(app)
      .post(`/api/events/${testEventId}/book`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(bookRes1.status).toBe(201);
    expect(bookRes1.body.booking.status).toBe('CONFIRMED');

    // User 2 attempts to book the full event
    const bookRes2 = await request(app)
      .post(`/api/events/${testEventId}/book`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(bookRes2.status).toBe(400);
    expect(bookRes2.body.error).toMatch(/fully booked|No seats remaining/i);
  });

  // RULE 1: A user cannot book the same event twice, unless they cancelled earlier booking
  test('Rule 1: A user cannot book the same event twice unless cancelled', async () => {
    // Create an event with 5 seats
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Rule 1 Multi-Seat Test Event',
        description: 'Checking duplicate booking prevention.',
        category: 'Testing',
        date_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Hall B',
        total_seats: 5
      });
    const multiEventId = eventRes.body.event.id;

    // 1st booking by User 2 -> succeeds
    const firstBooking = await request(app)
      .post(`/api/events/${multiEventId}/book`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(firstBooking.status).toBe(201);
    const bookingId = firstBooking.body.booking.id;

    // 2nd booking attempt by User 2 for same event -> rejected
    const dupBooking = await request(app)
      .post(`/api/events/${multiEventId}/book`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(dupBooking.status).toBe(400);
    expect(dupBooking.body.error).toMatch(/already booked a seat/i);

    // User 2 cancels earlier booking -> succeeds
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(cancelRes.status).toBe(200);

    // User 2 re-books after cancelling -> now succeeds!
    const rebookRes = await request(app)
      .post(`/api/events/${multiEventId}/book`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(rebookRes.status).toBe(201);

    // Cleanup
    await pool.query('DELETE FROM booking WHERE event_id = $1', [multiEventId]);
    await pool.query('DELETE FROM events WHERE id = $1', [multiEventId]);
  });

  // RULE 3: Past events cannot be booked, and bookings for them cannot be cancelled
  test('Rule 3: Past events cannot be booked and past bookings cannot be cancelled', async () => {
    expect(pastEventId).toBeDefined();

    // Attempt to book past event
    const pastBookRes = await request(app)
      .post(`/api/events/${pastEventId}/book`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(pastBookRes.status).toBe(400);
    expect(pastBookRes.body.error).toMatch(/past events/i);

    // Attempt to cancel seeded past booking for user 1
    const pastBookingQuery = await pool.query(
      "SELECT id FROM booking WHERE event_id = $1 AND user_id = $2 AND status = 'CONFIRMED'",
      [pastEventId, user1Id]
    );
    if (pastBookingQuery.rows.length > 0) {
      const pastBookingId = pastBookingQuery.rows[0].id;
      const cancelPastRes = await request(app)
        .post(`/api/bookings/${pastBookingId}/cancel`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(cancelPastRes.status).toBe(400);
      expect(cancelPastRes.body.error).toMatch(/past events|already taken place/i);
    }
  });

  // RULE 4: Users can only cancel their own bookings
  test('Rule 4: Users cannot cancel bookings belonging to other users', async () => {
    // Find booking created by user 1 on testEventId
    const bRes = await pool.query(
      "SELECT id FROM booking WHERE event_id = $1 AND user_id = $2 AND status = 'CONFIRMED'",
      [testEventId, user1Id]
    );
    expect(bRes.rows.length).toBeGreaterThan(0);
    const user1BookingId = bRes.rows[0].id;

    // User 2 attempts to cancel User 1's booking
    const unauthorizedCancel = await request(app)
      .post(`/api/bookings/${user1BookingId}/cancel`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(unauthorizedCancel.status).toBe(403);
    expect(unauthorizedCancel.body.error).toMatch(/authorized to cancel your own bookings/i);
  });

  // RULE 5: Admin cannot reduce an event's seats below the number already booked
  test('Rule 5: Admin cannot reduce seats below confirmed bookings count', async () => {
    // testEventId currently has 1 confirmed booking (total_seats = 1)
    // Admin attempts to reduce total_seats to 0 (or below confirmed bookings)
    const reduceRes = await request(app)
      .put(`/api/events/${testEventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ total_seats: 0 });
    expect(reduceRes.status).toBe(400);

    // Attempt to reduce to a positive number that is less than active bookings (e.g., if booked was 2 and set to 1)
    // Create an event with 2 bookings and test reduction:
    const event2Res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Rule 5 Capacity Reduction Test',
        description: 'Verify seat reduction constraint.',
        category: 'Testing',
        date_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Room 101',
        total_seats: 2
      });
    const e2Id = event2Res.body.event.id;

    // Book 2 seats (user 1 and user 2)
    await request(app).post(`/api/events/${e2Id}/book`).set('Authorization', `Bearer ${user1Token}`);
    await request(app).post(`/api/events/${e2Id}/book`).set('Authorization', `Bearer ${user2Token}`);

    // Admin tries to reduce total_seats to 1 (when 2 are booked)
    const invalidReduction = await request(app)
      .put(`/api/events/${e2Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ total_seats: 1 });
    expect(invalidReduction.status).toBe(400);
    expect(invalidReduction.body.error).toMatch(/Cannot reduce total seats to 1/i);

    // Cleanup
    await pool.query('DELETE FROM booking WHERE event_id = $1', [e2Id]);
    await pool.query('DELETE FROM events WHERE id = $1', [e2Id]);
  });

  // RULE 6: Only admins can manage events or see attendee lists
  test('Rule 6: Regular users are rejected from admin endpoints (event management & attendees)', async () => {
    // Normal user attempts to create event
    const unauthorizedCreate = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Unauthorized Event',
        description: 'Should fail with 403',
        date_time: new Date(Date.now() + 10000000).toISOString(),
        venue: 'Secret Cave',
        total_seats: 10
      });
    expect(unauthorizedCreate.status).toBe(403);
    expect(unauthorizedCreate.body.error).toMatch(/Administrator privileges required/i);

    // Normal user attempts to view attendee list
    const unauthorizedAttendees = await request(app)
      .get(`/api/events/${testEventId}/attendees`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(unauthorizedAttendees.status).toBe(403);
    expect(unauthorizedAttendees.body.error).toMatch(/Administrator privileges required/i);

    // Admin user can view attendee list successfully
    const adminAttendees = await request(app)
      .get(`/api/events/${testEventId}/attendees`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminAttendees.status).toBe(200);
    expect(adminAttendees.body.attendees).toBeInstanceOf(Array);
  });
});
