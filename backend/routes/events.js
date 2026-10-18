const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, optionalAuthenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/events
 * Public endpoint.
 * Browse events with server-side pagination, search by title, and filter (upcoming/past/all).
 * Returns dynamic calculation of seats_left for each event.
 */
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const filter = req.query.filter || 'upcoming'; // 'upcoming' (default), 'past', or 'all'

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`e.title ILIKE $${params.length}`);
    }

    if (filter === 'upcoming') {
      conditions.push(`e.date_time >= NOW()`);
    } else if (filter === 'past') {
      conditions.push(`e.date_time < NOW()`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM events e
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Events with dynamic seat calculation
    // Joins with confirmed bookings to determine exact seats_left
    const eventsParams = [...params, limit, offset];
    const eventsQuery = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.category,
        e.date_time,
        e.venue,
        e.total_seats,
        e.created_at,
        COALESCE(b.booked_count, 0)::int AS booked_seats,
        GREATEST(0, e.total_seats - COALESCE(b.booked_count, 0))::int AS seats_left,
        (e.date_time < NOW()) AS is_past
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::int AS booked_count
        FROM booking
        WHERE status = 'CONFIRMED'
        GROUP BY event_id
      ) b ON e.id = b.event_id
      ${whereClause}
      ORDER BY 
        CASE WHEN e.date_time >= NOW() THEN 0 ELSE 1 END ASC,
        e.date_time ASC
      LIMIT $${eventsParams.length - 1} OFFSET $${eventsParams.length}
    `;

    const eventsResult = await pool.query(eventsQuery, eventsParams);

    return res.json({
      events: eventsResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('Fetch events error:', err.message);
    return res.status(500).json({ error: 'Internal server error while fetching events.' });
  }
});

/**
 * GET /api/events/:id
 * Public endpoint.
 * Returns full details of an event with calculated seats_left.
 * If user is logged in, includes their booking status for this event.
 */
router.get('/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const eventQuery = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.category,
        e.date_time,
        e.venue,
        e.total_seats,
        e.created_at,
        e.updated_at,
        COALESCE(b.booked_count, 0)::int AS booked_seats,
        GREATEST(0, e.total_seats - COALESCE(b.booked_count, 0))::int AS seats_left,
        (e.date_time < NOW()) AS is_past
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::int AS booked_count
        FROM booking
        WHERE status = 'CONFIRMED'
        GROUP BY event_id
      ) b ON e.id = b.event_id
      WHERE e.id = $1
    `;

    const result = await pool.query(eventQuery, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = result.rows[0];

    // If user is authenticated, check their booking status for this event
    let userBooking = null;
    if (req.user) {
      const userBookingRes = await pool.query(
        "SELECT id, status, created_at FROM booking WHERE event_id = $1 AND user_id = $2 AND status = 'CONFIRMED'",
        [id, req.user.id]
      );
      if (userBookingRes.rows.length > 0) {
        userBooking = userBookingRes.rows[0];
      }
    }

    return res.json({
      event,
      user_booking: userBooking
    });
  } catch (err) {
    console.error('Fetch event detail error:', err.message);
    return res.status(500).json({ error: 'Internal server error while fetching event details.' });
  }
});

/**
 * POST /api/events
 * Admin only (Rule 6).
 * Create a new event with validation.
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, date_time, venue, total_seats } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long.' });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters long.' });
    }
    if (!venue || typeof venue !== 'string' || venue.trim().length < 2) {
      return res.status(400).json({ error: 'Venue is required.' });
    }
    if (!date_time || isNaN(Date.parse(date_time))) {
      return res.status(400).json({ error: 'A valid date and time is required.' });
    }
    if (new Date(date_time) <= new Date()) {
      return res.status(400).json({ error: 'Event date and time must be set in the future.' });
    }
    const parsedSeats = parseInt(total_seats, 10);
    if (isNaN(parsedSeats) || parsedSeats <= 0) {
      return res.status(400).json({ error: 'Total seats must be a positive integer greater than zero.' });
    }

    const result = await pool.query(
      `INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        category && category.trim() ? category.trim() : 'General',
        new Date(date_time).toISOString(),
        venue.trim(),
        parsedSeats,
        req.user.id
      ]
    );

    return res.status(201).json({
      message: 'Event created successfully.',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Create event error:', err.message);
    return res.status(500).json({ error: 'Internal server error while creating event.' });
  }
});

/**
 * PUT /api/events/:id
 * Admin only (Rule 6).
 * Edit an existing event.
 * Enforces Rule 5: "An admin cannot reduce an event's seats below the number already booked."
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, date_time, venue, total_seats } = req.body;

    // Check existing event
    const existing = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const currentEvent = existing.rows[0];

    // If total_seats is being changed, enforce Rule 5
    let newTotalSeats = currentEvent.total_seats;
    if (total_seats !== undefined) {
      const parsedSeats = parseInt(total_seats, 10);
      if (isNaN(parsedSeats) || parsedSeats <= 0) {
        return res.status(400).json({ error: 'Total seats must be a positive integer greater than zero.' });
      }

      // Query active confirmed bookings count
      const bookedRes = await pool.query(
        "SELECT COUNT(*)::int as count FROM booking WHERE event_id = $1 AND status = 'CONFIRMED'",
        [id]
      );
      const activeBookings = bookedRes.rows[0].count;

      // RULE 5 CHECK
      if (parsedSeats < activeBookings) {
        return res.status(400).json({
          error: `Cannot reduce total seats to ${parsedSeats}. There are already ${activeBookings} active confirmed bookings for this event.`
        });
      }
      newTotalSeats = parsedSeats;
    }

    const updatedTitle = title !== undefined ? title.trim() : currentEvent.title;
    const updatedDesc = description !== undefined ? description.trim() : currentEvent.description;
    const updatedCat = category !== undefined ? category.trim() : currentEvent.category;
    const updatedVenue = venue !== undefined ? venue.trim() : currentEvent.venue;
    const updatedDateTime = date_time !== undefined ? new Date(date_time).toISOString() : currentEvent.date_time;

    const result = await pool.query(
      `UPDATE events
       SET title = $1, description = $2, category = $3, date_time = $4, venue = $5, total_seats = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [updatedTitle, updatedDesc, updatedCat, updatedDateTime, updatedVenue, newTotalSeats, id]
    );

    return res.json({
      message: 'Event updated successfully.',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Update event error:', err.message);
    return res.status(500).json({ error: 'Internal server error while updating event.' });
  }
});

/**
 * DELETE /api/events/:id
 * Admin only (Rule 6).
 * Edge case handling: If event has active bookings, require confirmation flag `force=true`.
 * When deleted, any associated bookings are atomically marked as CANCELLED or deleted.
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    await client.query('BEGIN');

    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [id]);
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Check active bookings
    const bookedRes = await client.query(
      "SELECT COUNT(*)::int as count FROM booking WHERE event_id = $1 AND status = 'CONFIRMED'",
      [id]
    );
    const activeBookings = bookedRes.rows[0].count;

    if (activeBookings > 0 && !force) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Event has ${activeBookings} active confirmed booking(s). To proceed with deletion, pass ?force=true to confirm cancellation of all booked seats.`
      });
    }

    // Cascade cancel active bookings
    if (activeBookings > 0) {
      await client.query(
        "UPDATE booking SET status = 'CANCELLED', updated_at = NOW() WHERE event_id = $1 AND status = 'CONFIRMED'",
        [id]
      );
    }

    await client.query('DELETE FROM events WHERE id = $1', [id]);
    await client.query('COMMIT');

    return res.json({
      message: activeBookings > 0
        ? `Event and its ${activeBookings} active booking(s) were cancelled and removed successfully.`
        : 'Event deleted successfully.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete event error:', err.message);
    return res.status(500).json({ error: 'Internal server error while deleting event.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/events/:id/attendees
 * Admin only (Rule 6: "Only admins can manage events or see attendee lists.")
 * Lists all users who have confirmed bookings for a specific event.
 */
router.get('/:id/attendees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify event exists
    const eventRes = await pool.query('SELECT id, title, total_seats, date_time FROM events WHERE id = $1', [id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const event = eventRes.rows[0];

    // Fetch confirmed attendees
    const attendeesRes = await pool.query(`
      SELECT 
        b.id AS booking_id,
        b.status,
        b.created_at AS booked_at,
        u.id AS user_id,
        u.name,
        u.email
      FROM booking b
      JOIN users u ON b.user_id = u.id
      WHERE b.event_id = $1 AND b.status = 'CONFIRMED'
      ORDER BY b.created_at ASC
    `, [id]);

    return res.json({
      event: {
        id: event.id,
        title: event.title,
        total_seats: event.total_seats,
        date_time: event.date_time
      },
      total_attendees: attendeesRes.rows.length,
      attendees: attendeesRes.rows
    });
  } catch (err) {
    console.error('Fetch attendees error:', err.message);
    return res.status(500).json({ error: 'Internal server error while fetching attendee list.' });
  }
});

module.exports = router;
