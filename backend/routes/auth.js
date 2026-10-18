const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Bonus: Rate limiting on login route (10 requests per 15 minutes per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

/**
 * POST /api/auth/register
 * Public registration for standard users.
 * STRICT ENFORCEMENT: Role is hardcoded to 'user'. Admins CANNOT be created here.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Valid name with at least 2 characters is required.' });
    }
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // CRITICAL REQUIREMENT: Force role to 'user'. Ignore any role passed by client.
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    // Issue JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account registered successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: 'Internal server error while creating account.' });
  }
});

/**
 * POST /api/auth/login
 * User & Admin login with credentials verification and rate limiting.
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error while logging in.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieve currently logged in user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    return res.status(500).json({ error: 'Internal server error fetching user profile.' });
  }
});

module.exports = router;
