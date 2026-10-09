# 🎟️ TixHub – Full-Stack Online Event & Ticket Booking System

A full-stack web application for discovering and booking tickets for movies, live concerts, and college fests with interactive real-time seat reservation, JWT role-based authentication, and an Oracle 11g database backend.

---

## 🌟 Key Features

- **🎫 Interactive Seat Selection**: Visual cinema-style seat map with real-time availability and dynamic pricing calculation.
- **🔐 Secure Role-Based Authentication**:
  - User registration & login with password hashing via **bcryptjs**.
  - **Creator Portal**: Dedicated onboarding for event organizers to list events visible to all users for booking and manage/modify/delete only their own events.
  - Secure **JWT** session token management.
  - Dedicated **Admin Dashboard & My Dashboard** for event and platform management.
- **⚡ Transaction-Safe Booking Engine**: Concurrency control preventing duplicate seat reservations via atomic Oracle SQL transactions.
- **⭐ Event Rating & Review Aggregations**: Dynamic event ratings computed via SQL `LISTAGG` and `AVG` analytical functions.
- **📱 Responsive UI**: Modern responsive design with smooth animations, curated fest imagery, and category filtering.

---

## 🌟 Event Creator Feature (Multi-Organizer Platform)

TixHub includes a comprehensive **Creator Role** that transforms the platform from a single-vendor site into a **multi-organizer event marketplace**:

### 1. 🎯 Role Separation & Security
- **Super Admins**: Full platform control and global moderation.
- **Creators**: Can **only create, modify, and delete their own events**. Discover Events is view-only; creators cannot book tickets.
- **Users**: Browse and book tickets across all categories; cannot create or edit events.

### 2. 🚀 Self-Service Onboarding & Dedicated Portal
- **Direct Hero Call-to-Action**: Visitors can immediately sign up via the homepage banner:  
  `"Want to Host an Event? Create Creator Account"`.
- **Dedicated Authentication**: Custom registration and login workflows issuing JWT tokens with `role: 'creator'`.
- **Adaptive Navigation Bar**: Automatically surfaces **"Create Event"**, **"My Dashboard"**, and a personalized creator greeting (`Hi, <Creator Name>`).

### 3. 🛠️ Complete Event Lifecycle Management
- **Publish Events**: Create events across categories (**College Fest**, **Live Concert**, **Movie**) with date, time, venue, ticket price, and seat capacity. Published events are instantly live for all users.
- **Modify Events**: Edit venue, timing, seat capacity, or pricing on existing events directly from **My Dashboard**.
- **Delete Events**: Delete only their own events with automatic database cascade deletion of associated bookings.

### 4. 📊 Real-Time Ticket Analytics ("My Dashboard")
Creators receive a real-time business overview for every event they host:
- **Tickets Booked**: Live count of reserved seats (e.g., `24 Booked`).
- **Tickets Remaining**: Remaining availability (e.g., `26 Left / 50 Total`).
- **Capacity Fill Rate**: Real-time occupancy percentage (e.g., `48% filled`).
- Direct action buttons to **Edit Details** and **Delete Event**.

### 5. 🛡️ Database-Enforced Ownership Protection
- **Relational Integrity**: Backed by Oracle schema with `created_by NUMBER REFERENCES users(user_id) ON DELETE CASCADE`.
- **Backend Access Control**: Every `PUT /api/events/:id` and `DELETE /api/events/:id` verifies ownership against the authenticated JWT. Attempts by another creator return **`403 Forbidden: You are only allowed to modify/delete your own events`**.

### 6. 👁️ View-Only Discover Experience
- **Informative Creator Banner**: Displays a persistent notification when creators browse public listings:  
  *Creator Mode: You are viewing events in view-only mode. Creator accounts cannot book tickets.*
- **Locked Bookings**: Event cards display a disabled `Booking Disabled (Creator)` button.
- **User-Only Booking Auth**: Both "Book Now" and "My Bookings" strictly require a regular user account, keeping organizer and customer roles completely segregated.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+ Fetch API, DOM manipulation)
- **Backend**: Node.js, Express.js
- **Database**: Oracle Database 11g Express Edition (PL/SQL Triggers, Sequences, Constraints)
- **Authentication**: JSON Web Tokens (JWT HS256), bcryptjs
- **Driver**: `oracledb` (Thick mode with connection pooling)

---

## 📁 Project Structure

```
dbs_pro/
├── routes/
│   ├── auth.js          # User and Admin authentication routes
│   ├── bookings.js      # Booking creation, retrieval, and cancellation
│   ├── events.js        # Event listing and admin CRUD operations
│   └── ratings.js       # Event rating and review submissions
├── adminTokens.js       # JWT signing, verification, and role middleware
├── create-admin.js      # CLI utility to create admin accounts
├── db.js                # Oracle connection pool configuration
├── format.sql           # SQL*Plus formatting script for database viewing
├── schema.sql           # Oracle database DDL (tables, constraints, triggers)
├── script.js            # Frontend application logic and API interactions
├── seed.sql             # Demo events and sample booking data
├── server.js            # Express API entrypoint
├── web_css.css          # Styles and responsive layouts
├── web_html.html        # Main single-page application interface
├── .env.example         # Template for database credentials
└── .gitignore           # Git ignore rules for node_modules and secrets
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **Oracle Database 11g XE** (or higher) with Oracle Instant Client installed

### 2. Database Setup
Open **SQL*Plus** and run the schema and seed scripts:

```sql
sqlplus tixhub/TixHub123@localhost:1521/XE
SQL> @schema.sql
SQL> @seed.sql
```

*(Optional: Run `@format.sql` in SQL*Plus for clean tabular output when querying data).*

### 3. Backend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your Oracle connection credentials:
   ```env
   DB_USER=tixhub
   DB_PASSWORD=your_password
   DB_CONNECT_STRING=localhost:1521/XE
   PORT=3000
   ```

4. Create an initial Admin account:
   ```bash
   npm run create-admin "Admin Name" admin@tixhub.com AdminPassword123
   ```

5. Start the server:
   ```bash
   npm start
   ```

The API will run at `http://localhost:3000`.

### 4. Launch Frontend
Open `web_html.html` directly in your browser or run via Live Server.

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | User/Creator login & JWT issuance | Public |
| `POST` | `/api/auth/register-creator` | Register a new creator account | Public |
| `POST` | `/api/auth/creator-login` | Creator login & JWT issuance | Public |
| `POST` | `/api/auth/admin-login` | Admin login & JWT issuance | Public |
| `GET` | `/api/events` | Fetch all events (with creator info) | Public |
| `GET` | `/api/events/mine` | Fetch logged-in creator's events | Creator / Admin |
| `POST` | `/api/events` | Create new event listing | Creator / Admin |
| `PUT` | `/api/events/:id` | Modify event listing (creators only modify own) | Creator / Admin |
| `DELETE` | `/api/events/:id` | Delete event listing (creators only delete own) | Creator / Admin |
| `POST` | `/api/bookings` | Book selected seats | Authenticated Users |
| `GET` | `/api/bookings` | View user booking history | Authenticated Users |
| `DELETE` | `/api/bookings/:id` | Cancel an active booking | Authenticated Users |
| `POST` | `/api/ratings` | Rate an attended event | Authenticated Users |
