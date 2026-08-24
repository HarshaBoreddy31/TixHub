# 🎟️ TixHub – Full-Stack Online Event & Ticket Booking System

A full-stack web application for discovering and booking tickets for movies, live concerts, and college fests with interactive real-time seat reservation, JWT role-based authentication, and an Oracle 11g database backend.

---

## 🌟 Key Features

- **🎫 Interactive Seat Selection**: Visual cinema-style seat map with real-time availability and dynamic pricing calculation.
- **🔐 Secure Role-Based Authentication**:
  - User registration & login with password hashing via **bcryptjs**.
  - Secure **JWT** session token management.
  - Dedicated **Admin Dashboard** for creating and managing event listings.
- **⚡ Transaction-Safe Booking Engine**: Concurrency control preventing duplicate seat reservations via atomic Oracle SQL transactions.
- **⭐ Event Rating & Review Aggregations**: Dynamic event ratings computed via SQL `LISTAGG` and `AVG` analytical functions.
- **📱 Responsive UI**: Modern responsive design with smooth animations and category filtering.

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
| `POST` | `/api/auth/login` | User login & JWT issuance | Public |
| `POST` | `/api/auth/admin-login` | Admin login & JWT issuance | Public |
| `GET` | `/api/events` | Fetch all events & availability | Public |
| `POST` | `/api/events` | Create new event listing | Admin Only |
| `DELETE` | `/api/events/:id` | Delete event listing | Admin Only |
| `POST` | `/api/bookings` | Book selected seats | User Only |
| `GET` | `/api/bookings` | View user booking history | User Only |
| `DELETE` | `/api/bookings/:id` | Cancel an active booking | User Only |
| `POST` | `/api/ratings` | Rate an attended event | User Only |
