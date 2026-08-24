require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initPool, closePool } = require('./db');

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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

async function start() {
  await initPool();
  app.listen(PORT, () => {
    console.log(`TixHub API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown so the Oracle pool closes cleanly (Ctrl+C, etc.)
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});
