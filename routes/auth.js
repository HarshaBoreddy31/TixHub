const express = require('express');
const bcrypt = require('bcryptjs');
const { withConnection, oracledb } = require('../db');
const { issueToken, revoke, getBearerToken } = require('../adminTokens');

const router = express.Router();

function buildAuthResponse(userId, name, email, role) {
  const normalizedRole = (role || 'user').toLowerCase();
  const token = issueToken({ userId: Number(userId), name, email, role: normalizedRole });
  return { token, userId: Number(userId), name, email, role: normalizedRole };
}

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await withConnection((conn) =>
      conn.execute(
        `SELECT user_id, password_hash, name, role FROM users WHERE LOWER(email) = :email AND LOWER(role) = 'admin'`,
        { email: cleanEmail }
      )
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const match = await bcrypt.compare(password, row.PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    res.json(buildAuthResponse(row.USER_ID, row.NAME, cleanEmail, 'admin'));
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/admin-logout
router.post('/admin-logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) revoke(token);
  res.json({ success: true });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) revoke(token);
  res.json({ success: true });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const pwHash = await bcrypt.hash(password, 10);
    const outcome = await withConnection(async (conn) => {
      const exists = await conn.execute(
        `SELECT 1 FROM users WHERE LOWER(email) = :email`,
        { email: cleanEmail }
      );
      if (exists.rows.length > 0) {
        return { status: 409, body: { error: 'Email already registered' } };
      }

      const insert = await conn.execute(
        `INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :pw, 'user') RETURNING user_id INTO :id`,
        {
          name: cleanName,
          email: cleanEmail,
          pw: pwHash,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      const userId = insert.outBinds.id[0];
      await conn.commit();
      return { status: 201, body: buildAuthResponse(userId, cleanName, cleanEmail, 'user') };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/creator-login
router.post('/creator-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await withConnection((conn) =>
      conn.execute(
        `SELECT user_id, password_hash, name, role FROM users WHERE LOWER(email) = :email AND LOWER(role) = 'creator'`,
        { email: cleanEmail }
      )
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid creator credentials' });
    }

    const match = await bcrypt.compare(password, row.PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Invalid creator credentials' });
    }

    res.json(buildAuthResponse(row.USER_ID, row.NAME, cleanEmail, 'creator'));
  } catch (err) {
    console.error('Creator login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register-creator
router.post('/register-creator', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const pwHash = await bcrypt.hash(password, 10);
    const outcome = await withConnection(async (conn) => {
      const exists = await conn.execute(
        `SELECT 1 FROM users WHERE LOWER(email) = :email`,
        { email: cleanEmail }
      );
      if (exists.rows.length > 0) {
        return { status: 409, body: { error: 'Email already registered' } };
      }

      const insert = await conn.execute(
        `INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :pw, 'creator') RETURNING user_id INTO :id`,
        {
          name: cleanName,
          email: cleanEmail,
          pw: pwHash,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      const userId = insert.outBinds.id[0];
      await conn.commit();
      return { status: 201, body: buildAuthResponse(userId, cleanName, cleanEmail, 'creator') };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Creator registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/creator-logout
router.post('/creator-logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) revoke(token);
  res.json({ success: true });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await withConnection((conn) =>
      conn.execute(
        `SELECT user_id, password_hash, name, role FROM users WHERE LOWER(email) = :email AND LOWER(role) IN ('user', 'creator')`,
        { email: cleanEmail }
      )
    );

    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.PASSWORD_HASH);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    res.json(buildAuthResponse(row.USER_ID, row.NAME, cleanEmail, row.ROLE || 'user'));
  } catch (err) {
    console.error('User login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
