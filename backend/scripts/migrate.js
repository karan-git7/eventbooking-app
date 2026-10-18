const pool = require('../db');

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('--- Starting Database Migration ---');
    await client.query('BEGIN');

    // 1. Ensure Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Ensure Events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        date_time TIMESTAMP WITH TIME ZONE NOT NULL,
        venue VARCHAR(255) NOT NULL,
        total_seats INTEGER NOT NULL CHECK (total_seats > 0),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add category / updated_at if not present
    await client.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
      ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // 3. Ensure Booking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE booking ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // 4. Update constraints for Rule 1:
    // Drop old static unique constraint if exists so cancelled bookings don't block rebooking
    await client.query(`
      ALTER TABLE booking DROP CONSTRAINT IF EXISTS unique_active_booking;
    `);

    // Create partial unique index: user can only have ONE 'CONFIRMED' booking per event
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking 
      ON booking (event_id, user_id) 
      WHERE status = 'CONFIRMED';
    `);

    // Useful indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_date_time ON events (date_time);
      CREATE INDEX IF NOT EXISTS idx_booking_event_status ON booking (event_id, status);
      CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking (user_id);
    `);

    await client.query('COMMIT');
    console.log('✓ Database Schema & Constraints successfully migrated and updated.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
};

if (require.main === module) {
  migrate();
}

module.exports = migrate;
