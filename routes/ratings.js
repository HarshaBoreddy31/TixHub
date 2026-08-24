const express = require('express');
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

// POST /api/ratings
// Body: { bookingId, clientId?, userId?, rating }
// One rating per booking — MERGE inserts or updates as needed.
router.post('/', async (req, res) => {
  const { bookingId, clientId, userId, rating } = req.body;
  const ratingNum = Number(rating);
  const authUser = getAuthenticatedUser(req);
  const authUserId = authUser ? Number(authUser.userId ?? authUser.sub) : null;
  const effectiveUserId = authUserId || (userId != null ? Number(userId) : null);

  if (!bookingId || (!clientId && !effectiveUserId) || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'bookingId, clientId or userId, and a rating 1-5 are required' });
  }

  try {
    const outcome = await withConnection(async (conn) => {
      let bookingResult;
      if (effectiveUserId) {
        bookingResult = await conn.execute(
          `SELECT event_id FROM bookings WHERE booking_id = :bookingId AND (user_id = :userId OR client_id = :clientId)`,
          { bookingId, userId: effectiveUserId, clientId: clientId || `user_${effectiveUserId}` }
        );
      } else {
        bookingResult = await conn.execute(
          `SELECT event_id FROM bookings WHERE booking_id = :bookingId AND client_id = :clientId`,
          { bookingId, clientId }
        );
      }

      const booking = bookingResult.rows[0];
      if (!booking) {
        return { status: 404, body: { error: 'Booking not found for this client/user' } };
      }

      await conn.execute(
        `MERGE INTO ratings r
         USING (SELECT :bookingId AS booking_id FROM dual) src
         ON (r.booking_id = src.booking_id)
         WHEN MATCHED THEN
           UPDATE SET rating = :rating, rated_at = SYSDATE
         WHEN NOT MATCHED THEN
           INSERT (booking_id, event_id, rating)
           VALUES (:bookingId, :eventId, :rating)`,
        { bookingId, rating: ratingNum, eventId: booking.EVENT_ID }
      );

      await conn.commit();
      return { status: 200, body: { success: true } };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

module.exports = router;

