const http = require('http');
require('dotenv').config();
const { initPool, closePool } = require('./db');

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
const PORT = 3098;

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
  const c1Email = `mod_c1_${stamp}@example.com`;
  const c2Email = `mod_c2_${stamp}@example.com`;

  // 1. Register Creator 1 and Creator 2
  const reg1 = await request('POST', '/api/auth/register-creator', {
    name: 'Modifier One',
    email: c1Email,
    password: 'password123'
  });
  const token1 = reg1.data.token;

  const reg2 = await request('POST', '/api/auth/register-creator', {
    name: 'Modifier Two',
    email: c2Email,
    password: 'password123'
  });
  const token2 = reg2.data.token;

  // 2. Creator 1 creates an event
  console.log('\n--- Step 1: Creator 1 creates event ---');
  const createRes = await request('POST', '/api/events', {
    title: 'Original Fest Title',
    category: 'live',
    date: 'Nov 1, 2026',
    time: '5:00 PM',
    location: 'Chennai Trade Centre',
    price: 300,
    seats: 25
  }, token1);
  console.log('Created event ID:', createRes.data.id);
  const eventId = createRes.data.id;
  if (createRes.status !== 201) throw new Error('Create event failed');

  // 3. Creator 2 attempts to modify Creator 1's event (MUST FAIL 403)
  console.log('\n--- Step 2: Creator 2 attempts to modify Creator 1 event (expect 403) ---');
  const unauthorizedMod = await request('PUT', `/api/events/${eventId}`, {
    title: 'Hacked Title',
    category: 'live',
    date: 'Nov 1, 2026',
    time: '5:00 PM',
    location: 'Chennai Trade Centre',
    price: 10,
    seats: 25
  }, token2);
  console.log('Unauthorized modify status:', unauthorizedMod.status, unauthorizedMod.data);
  if (unauthorizedMod.status !== 403) throw new Error('Security check failed: another creator modified the event!');

  // 4. Creator 1 modifies their own event
  console.log('\n--- Step 3: Creator 1 modifies own event ---');
  const modRes = await request('PUT', `/api/events/${eventId}`, {
    title: 'Updated Grand Fest Title',
    category: 'college',
    date: 'Nov 15, 2026',
    time: '6:30 PM',
    location: 'JLN Stadium, Chennai',
    price: 550,
    seats: 30
  }, token1);
  console.log('Modify status:', modRes.status, modRes.data);
  if (modRes.status !== 200) throw new Error('Creator 1 modify failed');

  // 5. Verify public list reflects the changes
  console.log('\n--- Step 4: Verify public event reflects modified data ---');
  const getRes = await request('GET', `/api/events/${eventId}`);
  console.log('Fetched updated event:', getRes.data);
  if (
    getRes.data.title !== 'Updated Grand Fest Title' ||
    getRes.data.category !== 'college' ||
    getRes.data.price !== 550 ||
    getRes.data.seats !== 30 ||
    getRes.data.location !== 'JLN Stadium, Chennai'
  ) {
    throw new Error('Event fields do not match updated values');
  }

  // 6. Clean up
  console.log('\n--- Step 5: Clean up event ---');
  await request('DELETE', `/api/events/${eventId}`, null, token1);

  console.log('\nEVENT MODIFICATION VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
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
