const CATEGORY_ICON = {
    movie: '🎬',
    live: '🎸',
    college: '🎓'
};

function getCategoryIcon(category) {
    return CATEGORY_ICON[category] || '🎫';
}
const express = require('express');
const { withConnection, oracledb } = require('../db');
const { requireAdmin, requireCreatorOrAdmin } = require('../adminTokens');

const router = express.Router();

// Shared SELECT: joins booking_seats + ratings + users so frontend gets
// booked seats, rounded average rating, and creator info in a single round trip.
const LIST_QUERY = `
  SELECT
    e.event_id, e.title, e.category, e.event_date, e.event_time,
    e.location, e.price, e.total_seats, e.icon, e.created_by,
    u.name AS creator_name,
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
  LEFT JOIN users u ON u.user_id = e.created_by
`;

function rowToEvent(row) {
  const bookedSeats = row.BOOKED_SEATS_CSV
    ? row.BOOKED_SEATS_CSV.split(',').map(Number)
    : [];
  const totalSeats = Number(row.TOTAL_SEATS);
  const bookedCount = bookedSeats.length;
  const seatsLeft = Math.max(0, totalSeats - bookedCount);

  return {
    id: row.EVENT_ID,
    title: row.TITLE,
    category: row.CATEGORY,
    date: row.EVENT_DATE,
    time: row.EVENT_TIME,
    location: row.LOCATION,
    price: Number(row.PRICE),
    seats: totalSeats,
    totalSeats,
    bookedCount,
    seatsLeft,
    icon: getCategoryIcon(row.CATEGORY),
    createdBy: row.CREATED_BY != null ? Number(row.CREATED_BY) : null,
    creatorName: row.CREATOR_NAME || (row.CREATED_BY ? 'Creator' : 'TixHub Official'),
    bookedSeats,
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

// GET /api/events/mine — fetch events created by the authenticated creator
router.get('/mine', requireCreatorOrAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'admin';
    const result = await withConnection((conn) => {
      if (isSuperAdmin) {
        return conn.execute(`${LIST_QUERY} ORDER BY e.event_id DESC`);
      }
      return conn.execute(
        `${LIST_QUERY} WHERE e.created_by = :userId ORDER BY e.event_id DESC`,
        { userId: req.user.userId }
      );
    });
    res.json(result.rows.map(rowToEvent));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load creator events' });
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

// POST /api/events  (creator or admin)
router.post('/', requireCreatorOrAdmin, async (req, res) => {
  const { title, category, date, time, location, price, seats } = req.body;

  if (!title || !category || !date || !time || !location || !price || !seats) {
    return res.status(400).json({ error: 'Missing required event fields' });
  }
  if (!['movie', 'live', 'college'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const createdBy = req.user ? Number(req.user.userId) : null;

  try {
    const result = await withConnection(async (conn) => {
      const insert = await conn.execute(
        `INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon, created_by)
         VALUES (:title, :category, :eventDate, :eventTime, :location, :price, :seats, :icon, :createdBy)
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
          createdBy,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      await conn.commit();
      return insert.outBinds.id[0];
    });

    res.status(201).json({ id: result, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id  (creator or admin — creators can only modify their own)
router.put('/:id', requireCreatorOrAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  const { title, category, date, time, location, price, seats } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: 'Valid event ID is required' });
  }
  if (!title || !category || !date || !time || !location || !price || !seats) {
    return res.status(400).json({ error: 'Missing required event fields' });
  }
  if (!['movie', 'live', 'college'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const newSeats = Number(seats);
  const newPrice = Number(price);

  if (newSeats <= 0 || newPrice < 0) {
    return res.status(400).json({ error: 'Seats must be > 0 and price >= 0' });
  }

  try {
    const outcome = await withConnection(async (conn) => {
      const check = await conn.execute(
        `SELECT event_id, created_by, total_seats FROM events WHERE event_id = :id`,
        { id: eventId }
      );

      if (!check.rows || check.rows.length === 0) {
        return { status: 404, body: { error: 'Event not found' } };
      }

      const event = check.rows[0];

      // Admin can modify any event. Creators can only modify their own events.
      if (req.user.role !== 'admin' && Number(event.CREATED_BY) !== Number(req.user.userId)) {
        return {
          status: 403,
          body: { error: 'You are only allowed to modify your own events' }
        };
      }

      // Check that new seats are not less than max seat number already booked
      const maxSeatResult = await conn.execute(
        `SELECT NVL(MAX(bs.seat_number), 0) AS max_seat
         FROM booking_seats bs
         JOIN bookings b ON b.booking_id = bs.booking_id
         WHERE b.event_id = :id AND b.status = 'active'`,
        { id: eventId }
      );

      const maxSeat = maxSeatResult.rows[0]?.MAX_SEAT || 0;
      if (newSeats < maxSeat) {
        return {
          status: 400,
          body: { error: `Cannot reduce total seats below ${maxSeat} because seat ${maxSeat} is already booked` }
        };
      }

      await conn.execute(
        `UPDATE events
         SET title = :title,
             category = :category,
             event_date = :eventDate,
             event_time = :eventTime,
             location = :location,
             price = :price,
             total_seats = :seats,
             icon = :icon
         WHERE event_id = :id`,
        {
          id: eventId,
          title,
          category,
          eventDate: date,
          eventTime: time,
          location,
          price: newPrice,
          seats: newSeats,
          icon: CATEGORY_ICON[category]
        }
      );

      await conn.commit();
      return { status: 200, body: { success: true, id: eventId } };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id  (creator or admin — creators can only delete their own)
router.delete('/:id', requireCreatorOrAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    return res.status(400).json({ error: 'Valid event ID is required' });
  }

  try {
    const outcome = await withConnection(async (conn) => {
      const check = await conn.execute(
        `SELECT event_id, created_by FROM events WHERE event_id = :id`,
        { id: eventId }
      );

      if (!check.rows || check.rows.length === 0) {
        return { status: 404, body: { error: 'Event not found' } };
      }

      const event = check.rows[0];

      // Admin can delete any event. Creators can only delete their own events.
      if (req.user.role !== 'admin' && Number(event.CREATED_BY) !== Number(req.user.userId)) {
        return {
          status: 403,
          body: { error: 'You are only allowed to delete your own events' }
        };
      }

      await conn.execute(`DELETE FROM events WHERE event_id = :id`, { id: eventId });
      await conn.commit();
      return { status: 200, body: { success: true } };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
