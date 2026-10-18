const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const bookingsRoutes = require('./routes/bookings');

const app = express();

// Security and CORS configuration
app.use(cors({
  origin: true, // Allow frontend during development and production
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api', bookingsRoutes); // Handles /api/events/:id/book, /api/bookings/my, /api/bookings/:id/cancel

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    return res.json({
      status: 'healthy',
      app: 'EventBook API',
      timestamp: new Date().toISOString(),
      database_time: result.rows[0].db_time
    });
  } catch (err) {
    console.error('Health check database error:', err.message);
    return res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Centralized error handler: never leak stack traces to client
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({
    error: message
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 EventBook API server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;