const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/events/:id/book
 * Authenticated user books 1 seat for an event.
 * Enforces:
 *   - Rule 1: User cannot book same event twice, unless earlier booking was cancelled
 *   - Rule 2: Event cannot be overbooked (atomic row-level locking via SELECT ... FOR UPDATE)
 *   - Rule 3: Past events cannot be booked
 *   - Bonus: Concurrency protection against race conditions
 */
router.post('/events/:id/book', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    await client.query('BEGIN');

    // 1. Lock the event row for UPDATE to serialize concurrent booking attempts
    const eventRes = await client.query(
      'SELECT id, title, total_seats, date_time FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );

    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = eventRes.rows[0];

    // 2. Rule 3: Past events cannot be booked
    const eventDate = new Date(event.date_time);
    if (eventDate <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot book seats for past events.' });
    }

    // 3. Rule 1: Check if user already has an active confirmed booking for this event
    const userBookingRes = await client.query(
      "SELECT id, status FROM booking WHERE event_id = $1 AND user_id = $2 AND status = 'CONFIRMED'",
      [eventId, userId]
    );

    if (userBookingRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'You have already booked a seat for this event. Duplicate active bookings are not allowed.'
      });
    }

    // 4. Rule 2 & Bonus: Check capacity under row lock
    const bookedCountRes = await client.query(
      "SELECT COUNT(*)::int as count FROM booking WHERE event_id = $1 AND status = 'CONFIRMED'",
      [eventId]
    );
    const bookedCount = bookedCountRes.rows[0].count;

    if (bookedCount >= event.total_seats) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Event is fully booked. There are no remaining seats.'
      });
    }

    // 5. Check if user previously had a CANCELLED booking - if so, we can reactivate it or insert new
    // We insert a fresh confirmed booking record
    const newBookingRes = await client.query(
      `INSERT INTO booking (event_id, user_id, status)
       VALUES ($1, $2, 'CONFIRMED')
       RETURNING id, event_id, user_id, status, created_at`,
      [eventId, userId]
    );

    await client.query('COMMIT');

    const seatsRemaining = event.total_seats - (bookedCount + 1);

    return res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking: newBookingRes.rows[0],
      event: {
        id: event.id,
        title: event.title,
        total_seats: event.total_seats,
        seats_left: seatsRemaining
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');

    // Handle DB level partial unique constraint error (defensive fallback)
    if (err.code === '23505') {
      return res.status(400).json({
        error: 'You already have an active booking for this event.'
      });
    }

    console.error('Booking transaction error:', err.message);
    return res.status(500).json({ error: 'Internal server error while processing booking.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/bookings/my
 * Authenticated user views their own bookings list.
 * Includes event details and booking status.
 */
router.get('/bookings/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const bookingsQuery = `
      SELECT 
        b.id AS booking_id,
        b.status,
        b.created_at AS booked_at,
        b.updated_at AS status_updated_at,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.category AS event_category,
        e.date_time AS event_date_time,
        e.venue AS event_venue,
        e.total_seats AS event_total_seats,
        (e.date_time < NOW()) AS is_past_event
      FROM booking b
      JOIN events e ON b.event_id = e.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(bookingsQuery, [userId]);

    return res.json({
      bookings: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Fetch my bookings error:', err.message);
    return res.status(500).json({ error: 'Internal server error while fetching user bookings.' });
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Authenticated user cancels their own booking.
 * Enforces:
 *   - Rule 4: Users can only cancel their own bookings. Cancelling frees the seat.
 *   - Rule 3: Past events cannot be cancelled.
 */
router.post('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    await client.query('BEGIN');

    // Fetch booking joined with event
    const bookingRes = await client.query(
      `SELECT b.id, b.user_id, b.status, b.event_id, e.title, e.date_time
       FROM booking b
       JOIN events e ON b.event_id = e.id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    // RULE 4: Users can only cancel their own bookings
    if (booking.user_id !== userId && userRole !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are only authorized to cancel your own bookings.' });
    }

    // Check if already cancelled
    if (booking.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This booking has already been cancelled.' });
    }

    // RULE 3: Past events cannot be cancelled
    const eventDate = new Date(booking.date_time);
    if (eventDate <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot cancel bookings for events that have already taken place.'
      });
    }

    // Update status to CANCELLED
    const updateRes = await client.query(
      `UPDATE booking
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1
       RETURNING id, event_id, user_id, status, updated_at`,
      [bookingId]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Booking cancelled successfully. The seat has been freed for other attendees.',
      booking: updateRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel booking error:', err.message);
    return res.status(500).json({ error: 'Internal server error while cancelling booking.' });
  } finally {
    client.release();
  }
});

module.exports = router;
