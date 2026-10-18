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
    const passwordHash = await bcrypt.hash('UserPass123!', 10);
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);

    const adminRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Admin User', 'admin@eventbook.com', adminPasswordHash, 'admin']);

    const user1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Alex Johnson', 'user@eventbook.com', passwordHash, 'user']);

    const user2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Jane Smith', 'jane@eventbook.com', passwordHash, 'user']);

    const user3Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Bob Lee', 'bob@eventbook.com', passwordHash, 'user']);

    const adminId = adminRes.rows[0].id;
    const user1Id = user1Res.rows[0].id;
    const user2Id = user2Res.rows[0].id;
    const user3Id = user3Res.rows[0].id;

    console.log(`✓ Seeded Admin: ${adminRes.rows[0].email} (Password: AdminPass123!)`);
    console.log(`✓ Seeded Normal User: ${user1Res.rows[0].email} (Password: UserPass123!)`);
    console.log(`✓ Seeded Secondary Users: ${user2Res.rows[0].email}, ${user3Res.rows[0].email}`);

    // Helper dates
    const now = new Date();
    const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();
    const agoDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    // 2. Create Events
    // Event 1: Tech Workshop (Plenty of seats)
    const e1 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Next.js & React 19 Full-Stack Workshop',
      'Hands-on workshop exploring Next.js Server Components, App Router patterns, edge deployment, and microservices integration.',
      'Workshop',
      inDays(5),
      'Silicon Innovation Hub, Room 402, San Francisco',
      50,
      adminId
    ]);

    // Event 2: Full-Stack Developer Conference
    const e2 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Global Developers Summit 2026',
      'Connect with hundreds of software engineers, architects, and founders discussing distributed systems, PostgreSQL scaling, and cloud native architectures.',
      'Conference',
      inDays(12),
      'Metropolitan Expo Hall, New York',
      25,
      adminId
    ]);

    // Event 3: Nearly Full Event (Total seats: 3, Booked: 2, 1 seat remaining)
    const e3 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Indie Acoustic Live Session',
      'An intimate candlelit concert featuring indie acoustic performers and interactive Q&A. Strictly limited seating.',
      'Concert',
      inDays(3),
      'The Blue Note Loft, Austin, TX',
      3,
      adminId
    ]);

    // Event 4: Fully Booked Event (Total seats: 2, Booked: 2, 0 seats remaining)
    const e4 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Hands-on Kubernetes & Docker Lab',
      'Intensive deep dive into container orchestration, service meshes, and automated rollouts. Highly restricted capacity.',
      'Workshop',
      inDays(8),
      'Cloud Acceleration Center, Seattle',
      2,
      adminId
    ]);

    // Event 5: Past Event (Cannot be booked or cancelled)
    const e5 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Web3 & Smart Contracts Retrospective',
      'Archive of our autumn symposium on decentralized finance protocols and EVM security best practices.',
      'Conference',
      agoDays(14),
      'Civic Auditorium, Boston',
      100,
      adminId
    ]);

    // Event 6: UX & Design Systems Meetup
    const e6 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Design Systems & Micro-Interactions Meetup',
      'Discover how world-class product teams craft fluid animations, accessible design tokens, and seamless user experiences.',
      'Meetup',
      inDays(18),
      'Artisan Collective Studio, Brooklyn',
      30,
      adminId
    ]);

    // Event 7: Cyber Security Defensive Tactics
    const e7 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Zero Trust & Cloud Security Forum',
      'Practical security strategies for modern multi-tenant cloud applications, OAuth 2.1, and API vulnerability mitigation.',
      'Conference',
      inDays(25),
      'Tech Pavilion, Chicago',
      45,
      adminId
    ]);

    // Event 8: AI Product Founders Breakfast
    const e8 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'AI Product Founders Breakfast',
      'Informal morning meetup for founders and engineers building generative AI applications and agentic workflows.',
      'Meetup',
      inDays(30),
      'Venture Terrace, Denver',
      15,
      adminId
    ]);

    console.log('✓ Seeded 8 diverse events (upcoming, nearly full, sold out, past)');

    // 3. Seed Bookings to setup edge test cases
    // E3 (Nearly full: seats 3) - Booked by Jane and Bob -> 1 seat left
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED'), ($1, $3, 'CONFIRMED');
    `, [e3.rows[0].id, user2Id, user3Id]);

    // E4 (Sold out: seats 2) - Booked by Jane and Bob -> 0 seats left
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED'), ($1, $3, 'CONFIRMED');
    `, [e4.rows[0].id, user2Id, user3Id]);

    // E1 - Booked by Alex (user@eventbook.com) so he has an existing booking to see in "My Bookings"
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED');
    `, [e1.rows[0].id, user1Id]);

    // E5 (Past event) - Seed a past booking for Alex so past cancellation rule can be tested
    await client.query(`
      INSERT INTO booking (event_id, user_id, status)
      VALUES ($1, $2, 'CONFIRMED');
    `, [e5.rows[0].id, user1Id]);

    await client.query('COMMIT');
    console.log('✓ Seeded bookings with test scenarios:');
    console.log('   - Event 1 (Workshop): 1 active booking for Alex (test user can view/cancel)');
    console.log('   - Event 3 (Concert): 2 bookings / 3 seats (1 seat left)');
    console.log('   - Event 4 (Docker Lab): 2 bookings / 2 seats (Sold out / 0 seats left)');
    console.log('   - Event 5 (Past Event): Past event with booking (tests past event booking/cancelling rejection)');
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
