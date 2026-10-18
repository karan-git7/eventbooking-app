const pool = require('../db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log('--- Starting Database Seeding with Nepali Events ---');
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
    `, ['Aayush Shrestha', 'aayush@gmail.com', userPasswordHash, 'user']);

    const user3Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role;
    `, ['Pooja Sharma', 'pooja@gmail.com', userPasswordHash, 'user']);

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

    // 2. Create Authentic Nepali Events
    // Event 1: Kathmandu React & Next.js Meetup
    const e1 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Kathmandu Next.js & React Developer Meetup',
      'Join Kathmandu’s vibrant frontend community for talks on React Server Components, Next.js App Router performance, and production architecture.',
      'Workshop',
      inDays(4),
      'Moksh Live Hall, Jhamsikhel, Lalitpur',
      45,
      adminId
    ]);

    // Event 2: Nepal Tech Summit 2026
    const e2 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Nepal Developers & Tech Summit 2026',
      'Nepal’s flagship software engineering conference featuring engineering leaders discussing cloud architecture, PostgreSQL scalability, and IT exports.',
      'Conference',
      inDays(10),
      'Rastriya Sabha Griha (City Hall), Bhrikutimandap, Kathmandu',
      30,
      adminId
    ]);

    // Event 3: Pokhara Lakeside Acoustic Session (Nearly full: 3 total, 2 booked -> 1 seat left)
    const e3 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Pokhara Indie Acoustic Live Session',
      'An intimate candlelit acoustic live performance featuring popular Nepali indie singer-songwriters by Phewa Lake.',
      'Concert',
      inDays(3),
      'Busy Bee Cafe Terrace, Lakeside, Pokhara',
      3,
      adminId
    ]);

    // Event 4: Docker & Kubernetes Hands-on Lab (Sold out: 2 total, 2 booked -> 0 seats left)
    const e4 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Kathmandu DevOps & Kubernetes Bootcamp',
      'Intensive hands-on lab on container deployments, automated CI/CD pipelines, and high-availability servers. Limited capacity.',
      'Workshop',
      inDays(7),
      'Deerwalk Complex Tech Lab, Sifal, Kathmandu',
      2,
      adminId
    ]);

    // Event 5: Past Event (Cannot be booked or cancelled)
    const e5 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Nepal Cyber Security Symposium 2025',
      'Archive of our annual cybersecurity forum covering national digital infrastructure, ethical hacking, and web app defense.',
      'Conference',
      agoDays(15),
      'Nepal Academy Hall (Pragya Bhavan), Kamaladi, Kathmandu',
      80,
      adminId
    ]);

    // Event 6: Kupondole UI/UX Design Circle
    const e6 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Lalitpur Design System & UI/UX Gathering',
      'Designers and product engineers sharing practical insights into Figma tokens, accessible design, and responsive typography.',
      'Meetup',
      inDays(14),
      'The Yellow Durbar Hall, Kupondole, Lalitpur',
      25,
      adminId
    ]);

    // Event 7: Chitwan Tech & AI Innovators Forum
    const e7 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Chitwan Tech & AI Innovators Forum',
      'Bringing together students, freelancers, and software engineers from Chitwan to explore applied AI and web technology.',
      'Conference',
      inDays(20),
      'Bharatpur Garden Resort Convention Hall, Chitwan',
      40,
      adminId
    ]);

    // Event 8: Kathmandu Founders & Builders Breakfast
    const e8 = await client.query(`
      INSERT INTO events (title, description, category, date_time, venue, total_seats, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [
      'Kathmandu Tech Founders & Freelancers Coffee Meet',
      'Casual morning coffee discussion for tech startup founders, open-source contributors, and independent developers.',
      'Meetup',
      inDays(26),
      'Himalayan Java Coffee, Mandikhatar, Kathmandu',
      12,
      adminId
    ]);

    console.log('✓ Seeded 8 authentic Nepali events');

    // 3. Seed Bookings for rules validation
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
