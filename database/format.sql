-- ============================================================
-- SQL*Plus Formatting Settings for TixHub Database
-- ============================================================
SET LINESIZE 220;
SET PAGESIZE 100;
SET WRAP OFF;
SET TAB OFF;

-- ==================== USERS TABLE ====================
COLUMN user_id       FORMAT 99999      HEADING "UID";
COLUMN name          FORMAT A20        HEADING "NAME";
COLUMN email         FORMAT A30        HEADING "EMAIL";
COLUMN role          FORMAT A8         HEADING "ROLE";
COLUMN password_hash FORMAT A25        HEADING "PASSWORD_HASH";
COLUMN created_at    FORMAT A12        HEADING "CREATED";

-- ==================== EVENTS TABLE ====================
COLUMN event_id      FORMAT 99999      HEADING "EID";
COLUMN title         FORMAT A22        HEADING "TITLE";
COLUMN category      FORMAT A10        HEADING "CATEGORY";
COLUMN event_date    FORMAT A18        HEADING "EVENT_DATE";
COLUMN event_time    FORMAT A10        HEADING "TIME";
COLUMN location      FORMAT A28        HEADING "LOCATION";
COLUMN price         FORMAT 99999.99   HEADING "PRICE (Rs)";
COLUMN total_seats   FORMAT 9999       HEADING "SEATS";
COLUMN icon          FORMAT A4         HEADING "ICON";

-- ==================== BOOKINGS TABLE ====================
COLUMN booking_id    FORMAT 99999      HEADING "BID";
COLUMN client_id     FORMAT A22        HEADING "CLIENT_ID";
COLUMN total_price   FORMAT 99999.99   HEADING "TOTAL (Rs)";
COLUMN booking_date  FORMAT A12        HEADING "BOOK_DATE";
COLUMN status        FORMAT A10        HEADING "STATUS";

-- ==================== BOOKING_SEATS TABLE ====================
COLUMN seat_number   FORMAT 9999       HEADING "SEAT_NO";

-- ==================== RATINGS TABLE ====================
COLUMN rating_id     FORMAT 99999      HEADING "RID";
COLUMN rating        FORMAT 999        HEADING "RATING";
COLUMN rated_at      FORMAT A12        HEADING "RATED_AT";
