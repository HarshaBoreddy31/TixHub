const CATEGORY_ICON = {
    movie: '🎬',
    live: '🎸',
    college: '🎓'
};

function getCategoryIcon(category) {
    return CATEGORY_ICON[category] || '🎫';
}
const express = require('express');
const { withConnection } = require('../db');
const { requireAdmin } = require('../adminTokens');

const router = express.Router();

// Shared SELECT: joins booking_seats + ratings so the frontend gets
// booked seats and a rounded average rating without extra round trips.
const LIST_QUERY = `
  SELECT
    e.event_id, e.title, e.category, e.event_date, e.event_time,
    e.location, e.price, e.total_seats, e.icon,
    (
      SELECT LISTAGG(bs.seat_number, ',') WITHIN GROUP (ORDER BY bs.seat_number)
      FROM booking_seats bs
      JOIN bookings b ON b.booking_id = bs.booking_id
      WHERE b.event_id = e.event_id AND b.status = 'active'
    ) AS booked_seats_csv,
    (
      SELECT ROUND(AVG(r.rating), 1)
      FROM ratings r
      WHERE r.event_id = e.event_id
    ) AS avg_rating
  FROM events e
`;

function rowToEvent(row) {
  return {
    id: row.EVENT_ID,
    title: row.TITLE,
    category: row.CATEGORY,
    date: row.EVENT_DATE,
    time: row.EVENT_TIME,
    location: row.LOCATION,
    price: Number(row.PRICE),
    seats: Number(row.TOTAL_SEATS),
    icon: getCategoryIcon(row.CATEGORY),
    bookedSeats: row.BOOKED_SEATS_CSV
      ? row.BOOKED_SEATS_CSV.split(',').map(Number)
      : [],
    rating: row.AVG_RATING != null ? Number(row.AVG_RATING) : null
  };
}

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const result = await withConnection((conn) =>
      conn.execute(`${LIST_QUERY} ORDER BY e.event_id DESC`)
    );
    res.json(result.rows.map(rowToEvent));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await withConnection((conn) =>
      conn.execute(`${LIST_QUERY} WHERE e.event_id = :id`, {
        id: Number(req.params.id)
      })
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(rowToEvent(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load event' });
  }
});

// POST /api/events  (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { title, category, date, time, location, price, seats } = req.body;

  if (!title || !category || !date || !time || !location || !price || !seats) {
    return res.status(400).json({ error: 'Missing required event fields' });
  }
  if (!['movie', 'live', 'college'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const result = await withConnection(async (conn) => {
      const insert = await conn.execute(
        `INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
         VALUES (:title, :category, :eventDate, :eventTime, :location, :price, :seats, :icon)
         RETURNING event_id INTO :id`,
        {
          title,
          category,
          eventDate: date,
          eventTime: time,
          location,
          price: Number(price),
          seats: Number(seats),
          icon: CATEGORY_ICON[category],
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
        }
      );
      await conn.commit();
      return insert.outBinds.id[0];
    });

    res.status(201).json({ id: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE /api/events/:id  (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    await withConnection(async (conn) => {
      await conn.execute(`DELETE FROM events WHERE event_id = :id`, { id: eventId });
      await conn.commit();
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
