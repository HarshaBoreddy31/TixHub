const http = require('http');
require('dotenv').config();
const { initPool, closePool } = require('./db');

// Start Express server in-process for integration test
const express = require('express');
const cors = require('cors');
const eventsRoute = require('./routes/events');
const bookingsRoute = require('./routes/bookings');
const ratingsRoute = require('./routes/ratings');
const authRoute = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/events', eventsRoute);
app.use('/api/bookings', bookingsRoute);
app.use('/api/ratings', ratingsRoute);
app.use('/api/auth', authRoute);

let server;
const PORT = 3099;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://localhost:${PORT}${path}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  await initPool();
  server = app.listen(PORT);
  console.log('Test server started on port', PORT);

  const stamp = Date.now();
  const c1Email = `c1_${stamp}@example.com`;
  const c2Email = `c2_${stamp}@example.com`;
  const u1Email = `u1_${stamp}@example.com`;

  // 1. Register Creator 1
  console.log('\n--- Test 1: Register Creator 1 ---');
  const reg1 = await request('POST', '/api/auth/register-creator', {
    name: 'Creator One',
    email: c1Email,
    password: 'password123'
  });
  console.log('Reg1 status:', reg1.status, 'role:', reg1.data.role);
  if (reg1.status !== 201 || reg1.data.role !== 'creator') throw new Error('Reg1 failed');
  const token1 = reg1.data.token;
  const user1Id = reg1.data.userId;

  // 2. Creator 1 Login
  console.log('\n--- Test 2: Creator 1 Login ---');
  const log1 = await request('POST', '/api/auth/creator-login', {
    email: c1Email,
    password: 'password123'
  });
  console.log('Log1 status:', log1.status, 'token returned:', !!log1.data.token);
  if (log1.status !== 200 || !log1.data.token) throw new Error('Log1 failed');

  // 3. Register Creator 2
  console.log('\n--- Test 3: Register Creator 2 ---');
  const reg2 = await request('POST', '/api/auth/register-creator', {
    name: 'Creator Two',
    email: c2Email,
    password: 'password123'
  });
  console.log('Reg2 status:', reg2.status, 'role:', reg2.data.role);
  if (reg2.status !== 201) throw new Error('Reg2 failed');
  const token2 = reg2.data.token;

  // 4. Creator 1 creates an event
  console.log('\n--- Test 4: Creator 1 adds Event A ---');
  const evA = await request('POST', '/api/events', {
    title: `Rock Fest ${stamp}`,
    category: 'live',
    date: 'Oct 20, 2026',
    time: '7:00 PM',
    location: 'Chennai Stadium',
    price: 499,
    seats: 20
  }, token1);
  console.log('Event A create status:', evA.status, 'id:', evA.data.id);
  if (evA.status !== 201) throw new Error('Event A create failed');
  const eventAId = evA.data.id;

  // 5. Creator 2 creates an event
  console.log('\n--- Test 5: Creator 2 adds Event B ---');
  const evB = await request('POST', '/api/events', {
    title: `Comedy Night ${stamp}`,
    category: 'movie',
    date: 'Oct 25, 2026',
    time: '8:00 PM',
    location: 'HYD Auditorium',
    price: 299,
    seats: 25
  }, token2);
  console.log('Event B create status:', evB.status, 'id:', evB.data.id);
  if (evB.status !== 201) throw new Error('Event B create failed');
  const eventBId = evB.data.id;

  // 6. Public GET /api/events verifies both are present
  console.log('\n--- Test 6: Public GET /api/events ---');
  const allEv = await request('GET', '/api/events');
  const foundA = allEv.data.find(e => e.id === eventAId);
  const foundB = allEv.data.find(e => e.id === eventBId);
  console.log('Found Event A in public list:', !!foundA, 'creatorName:', foundA && foundA.creatorName);
  console.log('Found Event B in public list:', !!foundB, 'creatorName:', foundB && foundB.creatorName);
  if (!foundA || !foundB) throw new Error('Public events missing newly created events');

  // 7. Creator 1 GET /api/events/mine
  console.log('\n--- Test 7: Creator 1 GET /api/events/mine ---');
  const mine1 = await request('GET', '/api/events/mine', null, token1);
  console.log('Creator 1 mine count:', mine1.data.length);
  const mineA = mine1.data.some(e => e.id === eventAId);
  const mineB = mine1.data.some(e => e.id === eventBId);
  console.log('Event A in mine1:', mineA, '| Event B in mine1:', mineB);
  if (!mineA || mineB) throw new Error('Creator 1 mine endpoint did not filter properly');

  // 8. Creator 2 attempts to delete Event A (MUST FAIL with 403)
  console.log('\n--- Test 8: Security Check - Creator 2 tries to DELETE Event A ---');
  const delForbidden = await request('DELETE', `/api/events/${eventAId}`, null, token2);
  console.log('Delete status (expected 403):', delForbidden.status, 'data:', delForbidden.data);
  if (delForbidden.status !== 403) throw new Error('Security violation: Creator 2 deleted Creator 1 event!');

  // 9. Regular user registers and books seats for Event A
  console.log('\n--- Test 9: Regular User books seats for Creator 1 event ---');
  const userReg = await request('POST', '/api/auth/register', {
    name: 'Booking User',
    email: u1Email,
    password: 'password123'
  });
  const userToken = userReg.data.token;
  const bookRes = await request('POST', '/api/bookings', {
    eventId: eventAId,
    seats: [1, 2]
  }, userToken);
  console.log('Booking status:', bookRes.status, 'bookingId:', bookRes.data.bookingId);
  if (bookRes.status !== 201) throw new Error('Booking failed');

  // 10. Creator 1 deletes Event A (success)
  console.log('\n--- Test 10: Creator 1 deletes own Event A ---');
  const delSuccess = await request('DELETE', `/api/events/${eventAId}`, null, token1);
  console.log('Delete status:', delSuccess.status, 'data:', delSuccess.data);
  if (delSuccess.status !== 200) throw new Error('Creator 1 could not delete own event');

  // Clean up Event B
  await request('DELETE', `/api/events/${eventBId}`, null, token2);

  console.log('\nALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) server.close();
    await closePool();
  });
