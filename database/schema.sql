-- ============================================================
-- TixHub Database Schema - Oracle 11g Compatible
-- ============================================================

-- ============================================================
-- DROP OLD OBJECTS
-- ============================================================

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE ratings CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE booking_seats CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE bookings CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE events CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE users CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

-- ============================================================
-- DROP OLD SEQUENCES
-- ============================================================

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE users_seq';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE events_seq';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE bookings_seq';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE ratings_seq';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    user_id       NUMBER PRIMARY KEY,
    name          VARCHAR2(100) NOT NULL,
    email         VARCHAR2(150) NOT NULL UNIQUE,
    password_hash VARCHAR2(255) NOT NULL,
    role          VARCHAR2(10) DEFAULT 'admin' NOT NULL,
    created_at    DATE DEFAULT SYSDATE,

    CONSTRAINT chk_users_role
        CHECK (role IN ('admin','user'))
);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
    event_id     NUMBER PRIMARY KEY,
    title        VARCHAR2(150) NOT NULL,
    category     VARCHAR2(10) NOT NULL,
    event_date   VARCHAR2(50) NOT NULL,
    event_time   VARCHAR2(20) NOT NULL,
    location     VARCHAR2(200) NOT NULL,
    price        NUMBER(10,2) NOT NULL,
    total_seats  NUMBER NOT NULL,
    icon         VARCHAR2(10) DEFAULT '🎫',
    created_at   DATE DEFAULT SYSDATE,

    CONSTRAINT chk_events_category
        CHECK (category IN ('movie','live','college')),

    CONSTRAINT chk_events_price
        CHECK (price >= 0),

    CONSTRAINT chk_events_seats
        CHECK (total_seats > 0)
);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
    booking_id    NUMBER PRIMARY KEY,
    user_id       NUMBER REFERENCES users(user_id),
    event_id      NUMBER NOT NULL
                  REFERENCES events(event_id)
                  ON DELETE CASCADE,
    client_id     VARCHAR2(64) NOT NULL,
    total_price   NUMBER(10,2) NOT NULL,
    booking_date  DATE DEFAULT SYSDATE,
    status        VARCHAR2(10) DEFAULT 'active' NOT NULL,

    CONSTRAINT chk_bookings_status
        CHECK (status IN ('active','cancelled')),

    CONSTRAINT chk_bookings_price
        CHECK (total_price >= 0)
);

-- ============================================================
-- BOOKING SEATS
-- ============================================================

CREATE TABLE booking_seats (
    booking_id   NUMBER NOT NULL
                 REFERENCES bookings(booking_id)
                 ON DELETE CASCADE,

    seat_number  NUMBER NOT NULL,

    CONSTRAINT pk_booking_seats
        PRIMARY KEY (booking_id, seat_number)
);

-- ============================================================
-- RATINGS
-- ============================================================

CREATE TABLE ratings (
    rating_id    NUMBER PRIMARY KEY,

    booking_id   NUMBER NOT NULL UNIQUE
                 REFERENCES bookings(booking_id)
                 ON DELETE CASCADE,

    event_id     NUMBER NOT NULL
                 REFERENCES events(event_id)
                 ON DELETE CASCADE,

    rating       NUMBER(1) NOT NULL,

    rated_at     DATE DEFAULT SYSDATE,

    CONSTRAINT chk_ratings_range
        CHECK (rating BETWEEN 1 AND 5)
);

-- ============================================================
-- SEQUENCES
-- Oracle 11g uses sequences instead of identity columns
-- ============================================================

CREATE SEQUENCE users_seq
START WITH 1
INCREMENT BY 1
NOCACHE;

CREATE SEQUENCE events_seq
START WITH 1
INCREMENT BY 1
NOCACHE;

CREATE SEQUENCE bookings_seq
START WITH 1
INCREMENT BY 1
NOCACHE;

CREATE SEQUENCE ratings_seq
START WITH 1
INCREMENT BY 1
NOCACHE;

-- ============================================================
-- TRIGGERS
-- Automatically generate primary keys
-- ============================================================

CREATE OR REPLACE TRIGGER users_bir
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF :NEW.user_id IS NULL THEN
        SELECT users_seq.NEXTVAL
        INTO :NEW.user_id
        FROM dual;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER events_bir
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    IF :NEW.event_id IS NULL THEN
        SELECT events_seq.NEXTVAL
        INTO :NEW.event_id
        FROM dual;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER bookings_bir
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    IF :NEW.booking_id IS NULL THEN
        SELECT bookings_seq.NEXTVAL
        INTO :NEW.booking_id
        FROM dual;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER ratings_bir
BEFORE INSERT ON ratings
FOR EACH ROW
BEGIN
    IF :NEW.rating_id IS NULL THEN
        SELECT ratings_seq.NEXTVAL
        INTO :NEW.rating_id
        FROM dual;
    END IF;
END;
/

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_bookings_event
ON bookings(event_id);

CREATE INDEX idx_bookings_client
ON bookings(client_id);

CREATE INDEX idx_booking_seats_bk
ON booking_seats(booking_id);

CREATE INDEX idx_ratings_event
ON ratings(event_id);

COMMIT;