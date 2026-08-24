// create-admin.js — run once to create your admin login.
// Usage:  node create-admin.js "Your Name" you@example.com yourPassword
//
// This is what replaces the old hardcoded admin/password123 check —
// the password is hashed with bcrypt before it ever touches the DB.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initPool, closePool, withConnection } = require('./db');

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: node create-admin.js "Your Name" you@example.com yourPassword');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const cleanEmail = email.trim().toLowerCase();

  await initPool();
  try {
    await withConnection(async (conn) => {
      // Check if user/admin already exists
      const existing = await conn.execute(
        `SELECT user_id, role FROM users WHERE LOWER(email) = :email`,
        { email: cleanEmail }
      );

      if (existing.rows.length > 0) {
        await conn.execute(
          `UPDATE users SET name = :name, password_hash = :hash, role = 'admin' WHERE LOWER(email) = :email`,
          { name, hash: passwordHash, email: cleanEmail }
        );
        console.log(`Existing user updated to admin: ${cleanEmail}`);
      } else {
        await conn.execute(
          `INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, 'admin')`,
          { name, email: cleanEmail, hash: passwordHash }
        );
        console.log(`Admin created: ${cleanEmail}`);
      }
      await conn.commit();
    });
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
