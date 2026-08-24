const express = require('express');
const oracledb = require('oracledb');
const { withConnection } = require('../db');
const { verifyToken, getBearerToken } = require('../adminTokens');

const router = express.Router();

function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const user = verifyToken(token);
  if (!user || (!user.role || user.role.toLowerCase() !== 'user')) return null;
  return user;
}

// POST /api/bookings
// Body: { eventId, clientId?, userId?, seats: [1,2,3] }
router.post('/', async (req, res) => {
  const { eventId, clientId, userId, seats } = req.body;
  const authUser = getAuthenticatedUser(req);
  const authUserId = authUser ? Number(authUser.userId ?? authUser.sub) : null;
  const effectiveUserId = authUserId || (userId != null ? Number(userId) : null);
  const effectiveClientId = clientId || (effectiveUserId ? `user_${effectiveUserId}` : null);

  if (!effectiveUserId) {
    return res.status(401).json({ error: 'Please log in to book tickets' });
  }

  if (!eventId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'eventId and seats[] are required' });
  }

  try {
    const outcome = await withConnection(async (conn) => {
      const eventResult = await conn.execute(
        `SELECT price, total_seats FROM events WHERE event_id = :id`,
        { id: eventId }
      );
      const event = eventResult.rows[0];
      if (!event) {
        return { status: 404, body: { error: 'Event not found' } };
      }

      const takenResult = await conn.execute(
        `SELECT bs.seat_number
         FROM booking_seats bs
         JOIN bookings b ON b.booking_id = bs.booking_id
         WHERE b.event_id = :id AND b.status = 'active'`,
        { id: eventId }
      );
      const takenSeats = new Set(takenResult.rows.map((r) => r.SEAT_NUMBER));
      const conflict = seats.find((s) => takenSeats.has(s) || s < 1 || s > event.TOTAL_SEATS);
      if (conflict !== undefined) {
        return { status: 409, body: { error: `Seat ${conflict} is no longer available` } };
      }

      const totalPrice = event.PRICE * seats.length;

      const bookingInsert = await conn.execute(
        `INSERT INTO bookings (event_id, user_id, client_id, total_price, status)
         VALUES (:eventId, :userId, :clientId, :totalPrice, 'active')
         RETURNING booking_id INTO :id`,
        {
          eventId,
          userId: effectiveUserId ?? null,
          clientId: effectiveClientId,
          totalPrice,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      const bookingId = bookingInsert.outBinds.id[0];

      for (const seatNumber of seats) {
        await conn.execute(
          `INSERT INTO booking_seats (booking_id, seat_number) VALUES (:bookingId, :seatNumber)`,
          { bookingId, seatNumber }
        );
      }

      await conn.commit();
      return { status: 201, body: { bookingId, totalPrice, userId: effectiveUserId ?? null } };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Booking failed' });
  }
});

// GET /api/bookings?clientId=xxx or ?userId=xxx
router.get('/', async (req, res) => {
  const authUser = getAuthenticatedUser(req);
  const authUserId = authUser ? Number(authUser.userId ?? authUser.sub) : null;
  const queryUserId = req.query.userId != null ? Number(req.query.userId) : null;
  const queryClientId = req.query.clientId || null;
  const selectedUserId = authUserId || queryUserId;

  if (!selectedUserId && !queryClientId) {
    return res.status(400).json({ error: 'clientId or userId query param is required' });
  }

  try {
    const params = {};
    let whereClause = '';
    if (selectedUserId) {
      whereClause = "b.user_id = :userId AND b.status = 'active'";
      params.userId = selectedUserId;
    } else {
      whereClause = "b.client_id = :clientId AND b.status = 'active'";
      params.clientId = queryClientId;
    }

    const sql = `SELECT
          b.booking_id, b.user_id, b.total_price, b.booking_date,
          u.name AS user_name, u.email AS user_email,
          e.title, e.category, e.event_date, e.event_time, e.location, e.price, e.icon,
          r.rating,
          (
            SELECT LISTAGG(bs.seat_number, ',') WITHIN GROUP (ORDER BY bs.seat_number)
            FROM booking_seats bs WHERE bs.booking_id = b.booking_id
          ) AS seats_csv
        FROM bookings b
        JOIN events e ON e.event_id = b.event_id
        LEFT JOIN users u ON u.user_id = b.user_id
        LEFT JOIN ratings r ON r.booking_id = b.booking_id
        WHERE ${whereClause}
        ORDER BY b.booking_date DESC`;

    const result = await withConnection((conn) => conn.execute(sql, params));
    const bookings = result.rows.map((row) => ({
      id: row.BOOKING_ID,
      userId: row.USER_ID != null ? Number(row.USER_ID) : null,
      userName: row.USER_NAME || null,
      userEmail: row.USER_EMAIL || null,
      eventName: row.TITLE,
      category: row.CATEGORY,
      date: row.EVENT_DATE,
      time: row.EVENT_TIME,
      location: row.LOCATION,
      pricePerSeat: Number(row.PRICE),
      icon: row.ICON,
      totalPrice: Number(row.TOTAL_PRICE),
      bookingDate: row.BOOKING_DATE ? new Date(row.BOOKING_DATE).toLocaleDateString() : null,
      rating: row.RATING != null ? Number(row.RATING) : null,
      seats: row.SEATS_CSV ? row.SEATS_CSV.split(',').map(Number) : []
    }));

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// DELETE /api/bookings/:id?clientId=xxx or ?userId=xxx
router.delete('/:id', async (req, res) => {
  const authUser = getAuthenticatedUser(req);
  const authUserId = authUser ? Number(authUser.userId ?? authUser.sub) : null;
  const queryUserId = req.query.userId != null ? Number(req.query.userId) : null;
  const queryClientId = req.query.clientId || null;
  const selectedUserId = authUserId || queryUserId;
  const bookingId = Number(req.params.id);

  if (!selectedUserId && !queryClientId) {
    return res.status(400).json({ error: 'clientId or userId query param is required' });
  }

  try {
    const deleted = await withConnection(async (conn) => {
      let result;
      if (selectedUserId) {
        result = await conn.execute(
          `DELETE FROM bookings WHERE booking_id = :id AND (user_id = :userId OR client_id = :clientId)`,
          { id: bookingId, userId: selectedUserId, clientId: queryClientId || `user_${selectedUserId}` }
        );
      } else {
        result = await conn.execute(
          `DELETE FROM bookings WHERE booking_id = :id AND client_id = :clientId`,
          { id: bookingId, clientId: queryClientId }
        );
      }
      await conn.commit();
      return result.rowsAffected;
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Booking not found for this owner' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
