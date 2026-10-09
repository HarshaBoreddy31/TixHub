require('dotenv').config();
const { initPool, withConnection, closePool } = require('../db');

async function migrate() {
  await initPool();
  await withConnection(async (conn) => {
    try {
      await conn.execute('ALTER TABLE users DROP CONSTRAINT chk_users_role');
      console.log('Dropped old chk_users_role');
    } catch(e) {
      console.log('Drop constraint note:', e.message);
    }

    try {
      await conn.execute('ALTER TABLE users MODIFY (role VARCHAR2(20))');
      console.log('Modified users.role to VARCHAR2(20)');
    } catch(e) {
      console.log('Modify column note:', e.message);
    }

    try {
      await conn.execute("ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('admin','user','creator'))");
      console.log('Added new chk_users_role constraint');
    } catch(e) {
      console.log('Add constraint note:', e.message);
    }

    try {
      await conn.execute('ALTER TABLE events ADD created_by NUMBER REFERENCES users(user_id) ON DELETE CASCADE');
      console.log('Added created_by column to events table');
    } catch(e) {
      console.log('Add column note:', e.message);
    }

    try {
      await conn.execute('CREATE INDEX idx_events_created_by ON events(created_by)');
      console.log('Created idx_events_created_by index');
    } catch(e) {
      console.log('Index note:', e.message);
    }

    await conn.commit();
    console.log('Migration committed successfully!');
  });
  await closePool();
}

migrate().catch(console.error);
