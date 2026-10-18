const pool = require('../db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log('--- Starting Database Seeding ---');
    await client.query('BEGIN');

    // Clean existing data for clean reproducible state
    await client.query('DELETE FROM booking;');
    await client.query('DELETE FROM events;');
    await client.query('DELETE FROM users;');

    console.log('✓ Cleared previous seed data');

    // 1. Create Users
    const userPasswordHash = await bcrypt.hash('karan@123', 10);
    const adminPasswordHash = await bcrypt.hash('admin@123', 10);

    const adminRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Admin', 'admin@gmail.com', adminPasswordHash, 'admin']);

    const user1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Karan Gupta', 'karan@gmail.com', userPasswordHash, 'user']);

    const user2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Jane Smith', 'jane@gmail.com', userPasswordHash, 'user']);

    const user3Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Bob Lee', 'bob@gmail.com', userPasswordHash, 'user']);

    const adminId = adminRes.rows[0].id;
    const user1Id = user1Res.rows[0].id;
    const user2Id = user2Res.rows[0].id;
    const user3Id = user3Res.rows[0].id;

    console.log(`✓ Seeded Admin: ${adminRes.rows[0].email} (Password: admin@123)`);
    console.log(`✓ Seeded User: ${user1Res.rows[0].email} (Password: karan@123)`);

    // Helper dates
    const now = new Date();
    const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();
    const agoDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    // 2. Create Events with realistic, clean product descriptions
    const e1 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Next.js & React Full-Stack Workshop',
      'Learn how to architect high-performance web applications using modern React patterns, server-side data fetching, and edge infrastructure.',
      'Workshop',
      inDays(5),
      'Civic Tech Center, Hall B, San Francisco',
      50,
      adminId
    ]);

    const e2 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Global Software Engineering Summit',
      'Join software engineers, technical leads, and founders for an inspiring day discussing scalable distributed systems, database reliability, and cloud design.',
      'Conference',
      inDays(12),
      'Grand Union Convention Hall, New York',
      25,
      adminId
    ]);

    const e3 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Acoustic Rooftop Session',
      'An intimate evening of live indie acoustic performances and artist conversations under the city skyline.',
      'Concert',
      inDays(3),
      'The Sky Lounge Terrace, Austin',
      3,
      adminId
    ]);

    const e4 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Docker & Containerization Masterclass',
      'Hands-on lab mastering container building, multi-stage images, networking, and production container security.',
      'Workshop',
      inDays(8),
      'Innovation Hub Lab 2, Seattle',
      2,
      adminId
    ]);

    const e5 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Autumn Tech & Product Retrospective',
      'Our past season symposium covering engineering retrospectives, team retros, and architectural lessons from production incidents.',
      'Conference',
      agoDays(14),
      'Downtown Exhibition Center, Boston',
      100,
      adminId
    ]);

    const e6 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Modern UI/UX Design System Meetup',
      'Explore the principles of crafting accessible, modular design systems that bridge the gap between Figma components and clean production code.',
      'Meetup',
      inDays(18),
      'Artisan Loft Studio, Brooklyn',
      30,
      adminId
    ]);

    const e7 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Cloud Security & Identity Forum',
      'Practical security strategies for modern web APIs, token handling, threat modeling, and defending against common web vulnerabilities.',
      'Conference',
      inDays(25),
      'Metro Tech Pavilion, Chicago',
      45,
      adminId
    ]);

    const e8 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Tech Founders & Creators Breakfast',
      'Casual morning gathering for developers, product designers, and early-stage entrepreneurs to share ideas and exchange feedback.',
      'Meetup',
      inDays(30),
      'The Roasted Bean Coffeehouse, Denver',
      15,
      adminId
    ]);

    console.log('✓ Seeded 8 realistic events');

    // 3. Seed Bookings for edge rules:
    // E3: 2 booked / 3 total -> 1 seat left
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED'), ($1, $3, 'CONFIRMED');
    `, [e3.rows[0].id, user2Id, user3Id]);

    // E4: 2 booked / 2 total -> 0 seats left (Sold out)
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED'), ($1, $3, 'CONFIRMED');
    `, [e4.rows[0].id, user2Id, user3Id]);

    // E1: 1 active booking for Karan
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED');
    `, [e1.rows[0].id, user1Id]);

    // E5: Past booking for Karan (to verify past cancellation rule)
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED');
    `, [e5.rows[0].id, user1Id]);

    await client.query('COMMIT');
    console.log('--- Database Seeding Successfully Completed ---');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;
