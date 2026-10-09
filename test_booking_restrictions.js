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

  const timestamp = Date.now();
  const creatorEmail = `creator_restrict_${timestamp}@test.com`;
  const userEmail = `user_restrict_${timestamp}@test.com`;

  try {
    // 1. Register a Creator
    console.log('\n--- 1. Register Creator ---');
    const regCreator = await request('POST', '/api/auth/register-creator', {
      name: 'Fest Organizer',
      email: creatorEmail,
      password: 'password123'
    });
    console.log('Creator Register:', regCreator.status, regCreator.data.name, 'Role:', regCreator.data.role);
    if (regCreator.status !== 201) throw new Error('Failed to register creator');
    const creatorToken = regCreator.data.token;
    const creatorUserId = regCreator.data.userId;

    // 2. Register a Regular User
    console.log('\n--- 2. Register Regular User ---');
    const regUser = await request('POST', '/api/auth/register', {
      name: 'Regular Attendee',
      email: userEmail,
      password: 'password123'
    });
    console.log('User Register:', regUser.status, regUser.data.name, 'Role:', regUser.data.role);
    if (regUser.status !== 201) throw new Error('Failed to register user');
    const userToken = regUser.data.token;
    const regularUserId = regUser.data.userId;

    // 3. Creator creates an event
    console.log('\n--- 3. Creator Creates Event ---');
    const createEvt = await request(
      'POST',
      '/api/events',
      {
        title: `Campus Fest ${timestamp}`,
        category: 'college',
        date: 'Nov 15, 2026',
        time: '5:00 PM',
        location: 'Main Auditorium',
        price: 250,
        seats: 50
      },
      creatorToken
    );
    console.log('Create Event:', createEvt.status, createEvt.data);
    if (createEvt.status !== 201) throw new Error('Failed to create event');
    const eventId = createEvt.data.id || createEvt.data.eventId;

    // 4. Creator attempts to book tickets with creatorToken -> MUST BE 403 Forbidden
    console.log('\n--- 4. Creator attempts booking with token (Expect 403) ---');
    const creatorBookingWithToken = await request(
      'POST',
      '/api/bookings',
      {
        eventId,
        seats: [1, 2]
      },
      creatorToken
    );
    console.log('Creator Booking Status:', creatorBookingWithToken.status);
    console.log('Creator Booking Response:', creatorBookingWithToken.data);
    if (creatorBookingWithToken.status !== 403) {
      throw new Error(`Expected 403 Forbidden for creator booking, got ${creatorBookingWithToken.status}`);
    }

    // 5. Creator attempts to book by passing creatorUserId in body -> MUST BE 403 Forbidden
    console.log('\n--- 5. Creator attempts booking by passing userId directly (Expect 403) ---');
    const creatorBookingWithUserId = await request(
      'POST',
      '/api/bookings',
      {
        eventId,
        userId: creatorUserId,
        seats: [1, 2]
      }
    );
    console.log('Creator UserId Booking Status:', creatorBookingWithUserId.status);
    console.log('Creator UserId Booking Response:', creatorBookingWithUserId.data);
    if (creatorBookingWithUserId.status !== 403) {
      throw new Error(`Expected 403 Forbidden for creator userId booking, got ${creatorBookingWithUserId.status}`);
    }

    // 6. Anonymous attempt without userId -> MUST BE 401 Unauthorized
    console.log('\n--- 6. Unauthenticated booking attempt without userId (Expect 401) ---');
    const anonBooking = await request('POST', '/api/bookings', {
      eventId,
      seats: [1, 2]
    });
    console.log('Anon Booking Status:', anonBooking.status);
    console.log('Anon Booking Response:', anonBooking.data);
    if (anonBooking.status !== 401) {
      throw new Error(`Expected 401 for anonymous booking, got ${anonBooking.status}`);
    }

    // 7. Regular User books tickets -> MUST BE 201 Created
    console.log('\n--- 7. Regular user books tickets (Expect 201) ---');
    const userBooking = await request(
      'POST',
      '/api/bookings',
      {
        eventId,
        seats: [1, 2]
      },
      userToken
    );
    console.log('User Booking Status:', userBooking.status);
    console.log('User Booking Response:', userBooking.data);
    if (userBooking.status !== 201) {
      throw new Error(`Expected 201 Created for regular user booking, got ${userBooking.status}`);
    }
    const bookingId = userBooking.data.bookingId;

    // Cleanup: cancel booking and delete event
    console.log('\n--- 8. Cleanup ---');
    await request('DELETE', `/api/bookings/${bookingId}?userId=${regularUserId}`, null, userToken);
    await request('DELETE', `/api/events/${eventId}`, null, creatorToken);
    console.log('Cleanup completed successfully.');

    console.log('\n=========================================');
    console.log('ALL BOOKING RESTRICTION TESTS PASSED! 🎉');
    console.log('=========================================');
  } finally {
    if (server) server.close();
    await closePool();
  }
}

run().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
