-- ============================================================
-- TixHub Seed Data
-- Run AFTER schema.sql:  SQL> @seed.sql
-- Recreates the same 6 demo events from the original script.js,
-- plus sample bookings so the seat map isn't empty on first run.
-- ============================================================

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('OG', 'movie', 'September 25, 2026', '7:00 AM', 'Sandhya Picture Palace, HYD', 450, 25, '🎬');

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('Varanasi', 'movie', 'March 5, 2027', '2:00 PM', 'Sudharsan 70mm, HYD', 450, 25, '🎬');

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('DSP Live Concert', 'live', 'March 28, 2026', '6:30 PM', 'Uppal, Gachibowli, Hyderabad', 2500, 30, '🎸');

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('VIT Tech Fest 2026', 'college', 'March 30, 2026', '10:00 AM', 'VIT University Campus', 299, 40, '🎓');

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('Salaar', 'movie', 'December 22, 2026', '9:30 PM', 'Sangeeth Theatre, Nandyal', 500, 25, '🎬');

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('VIT Techmalayan', 'college', 'April 2, 2026', '9:00 AM', 'VIT Vellore Campus', 250, 50, '🎓');

INSERT INTO events (title, category, event_date, event_time, location, price, total_seats, icon)
VALUES ('Indie Music Festival', 'live', 'April 5, 2026', '5:00 PM', 'Wankhede, Mumbai', 799, 35, '🎵');

COMMIT;

-- ------------------------------------------------------------
-- Sample bookings (demo client) so seat maps show some seats
-- already taken, and ratings tables aren't empty for testing.
-- ------------------------------------------------------------
INSERT INTO bookings (event_id, client_id, total_price, status)
VALUES (1, 'seed-demo-client', 450 * 3, 'active');

INSERT INTO booking_seats (booking_id, seat_number)
SELECT booking_id, 3 FROM bookings WHERE event_id = 1 AND client_id = 'seed-demo-client';
INSERT INTO booking_seats (booking_id, seat_number)
SELECT booking_id, 5 FROM bookings WHERE event_id = 1 AND client_id = 'seed-demo-client';
INSERT INTO booking_seats (booking_id, seat_number)
SELECT booking_id, 8 FROM bookings WHERE event_id = 1 AND client_id = 'seed-demo-client';

INSERT INTO ratings (booking_id, event_id, rating)
SELECT booking_id, 1, 4 FROM bookings WHERE event_id = 1 AND client_id = 'seed-demo-client';

COMMIT;
