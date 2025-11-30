# Game Library – COMP3810SEF Group Project

> **Course:** COMP3810SEF – Server-side Technologies and Cloud Computing  
> **Project Topic:** Game Library (Game Backlog Manager)  
> **Group No.:** Group 14  
> **Cloud URL (for testing):** https://comp3810-game-library.onrender.com

### Group Members

- OU Jinwei (SID: 13910893)
- Yu Ming Chun (SID: 13914100)
- Tam Chun Wa Jeffrey (SID: 13932420)
- So Chun Kit (SID: 13902647)
- Lam Cheuk Hin (SID: 14027822)

---

## 1. Project Overview

This project is a simple **Game Backlog Manager** built with  
**Node.js + Express + MongoDB (Mongoose) + EJS**.

Users can:

- Register / login with **username + password**
- Login with **Google OAuth 2.0**
- Manage a shared list of games (create / edit / delete)
- Access a **RESTful JSON API** for the game data

> Note: In the current version, the game list is **shared by all users**
> (not a per-user private library).

---

## 2. Project Files Introduction

- **`server.js`**
  - Main Express application
  - Handles:
    - MongoDB connection (via Mongoose)
    - Session management (`cookie-session`)
    - Local login / logout / registration
    - Google OAuth 2.0 login
    - CRUD web pages for the Game library
    - RESTful JSON APIs for Game (GET/POST/PUT/DELETE)

- **`package.json`**
  - Project metadata and dependencies, e.g.:
    - `express`, `mongoose`, `cookie-session`, `bcrypt`, `dotenv`, `node-fetch`
  - Scripts:
    - `"start": "node server.js"`

- **`public/`**
  - `styles.css` – shared CSS for all pages  
    (login, register, game list, add/edit forms)

- **`views/`** (EJS templates)
  - `login.ejs` – login page (local + Google)
  - `register.ejs` – registration page
  - `games.ejs` – main **Game Library** page (CRUD UI)
  - `game-form.ejs` – add / edit game form

- **`models/`**
  - `User.js` – User schema & model
    - Local users: `username`, `passwordHash`, `provider = 'local'`
    - Google users: `username` (email), `googleId`, `provider = 'google'`
  - `Game.js` – Game schema & model
    - Fields: `title`, `platform`, `genre`, `rating`, `status`

---

## 3. Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas (via Mongoose)
- **Views:** EJS templates
- **Auth & Session:**
  - Local username/password (hashed with `bcrypt`)
  - Google OAuth 2.0 (OpenID Connect ID token)
  - `cookie-session` for session management
- **Styling:** Custom CSS (`public/styles.css`)
- **API Client (for demo):** `curl`

---

## 4. Prerequisites

- Node.js **16+**
- npm
- A MongoDB Atlas cluster (connection string)
- A Google Cloud project with OAuth 2.0 credentials  
  (Web Application type)

---

## 5. Setup & Run (Local)

### 5.1 Clone and install

```bash
git clone https://github.com/oswinou/comp3810-game-library.git
cd comp3810-game-library
npm install
````

### 5.2 Environment variables

Create a `.env` file in the project root:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority

SESSION_SECRET=some-very-long-random-string

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8089/auth/google/callback
```

> On Render or other cloud platforms, set the **same keys** in the
> dashboard (`MONGODB_URI`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`,
> `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`), but change the
> callback URL to
> `https://comp3810-game-library.onrender.com/auth/google/callback`.

### 5.3 Start the server

```bash
npm start
# or
node server.js
```

By default the app listens on:

```text
http://localhost:8089
```

---

## 6. Operation Guide (Web UI)

### 6.1 Login / Logout pages

1. Open `http://localhost:8089`
   → automatically redirect to `/login`.
2. **Local login flow**

   * Click **Register**
   * Fill in username / password / confirm password
   * After successful registration, you are redirected back to login
     with a **green success message**.
   * Enter the same username/password to log in.
3. **Google login flow**

   * On the login page, click **“Login with Google”**
   * Choose your Google account and grant permission
   * First login with this Google account will auto-create a user
     in MongoDB.
4. After login, you are redirected to `/games` (Game Library page).
5. To logout, click **“Logout”** in the top-right corner.
   This clears the cookie session and sends you back to `/login`.

### 6.2 CRUD Web Pages (Game Library)

After login, `/games` shows the **Game Library**:

Each game has:

* `title` – game title
* `platform` – e.g. “Steam”, “PS5”
* `genre` – e.g. “Action RPG”
* `rating` – number (0–10)
* `status` – one of `backlog`, `playing`, `cleared`

**Create**

* Click **“+ Add New Game”**
* Fill in the form (title, platform, genre, rating, status)
* Click **Create**
* You will be redirected back to `/games` with the new row shown.

**Read**

* `/games` lists **all games** in the shared library.
* The table shows title, platform, genre, rating, and status badge.

**Update**

* In each row, click **Edit**.
* Modify the fields in the form (e.g. change rating/status).
* Click **Update** to save changes and return to `/games`.

**Delete**

* In each row, click **Delete**.
* A browser confirmation dialog will appear (“Are you sure?”).
* Click **OK** to delete the game, or **Cancel** to keep it.

> All users share the same library. Any change is visible to all users.

---

## 7. RESTful CRUD Services (API)

The server also provides RESTful JSON APIs **without authentication**
(for marking and demo).

Base URL (local):

```text
http://localhost:8089/api/games
```

### 7.1 API list

* `GET /api/games`

  * List all games.
  * Supports optional query parameters:

    * `status` – filter by `backlog | playing | cleared`
    * `platform` – filter by platform (e.g. `Steam`)
    * `minRating` – filter by rating ≥ value

* `GET /api/games/:id`

  * Get a single game by MongoDB `_id`.

* `POST /api/games`

  * Create a new game.
  * JSON body:

    ```json
    {
      "title": "Elden Ring",
      "platform": "PS5",
      "genre": "Action RPG",
      "rating": 10,
      "status": "cleared"
    }
    ```

* `PUT /api/games/:id`

  * Update an existing game by `_id`.

* `DELETE /api/games/:id`

  * Delete a game by `_id`.

### 7.2 curl Testing Commands (local)

**GET – list all**

```bash
curl http://localhost:8089/api/games
```

**GET – with query**

```bash
curl "http://localhost:8089/api/games?status=playing&minRating=8"
```

**POST – create**

```bash
curl -X POST http://localhost:8089/api/games ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Hades II\",\"platform\":\"Steam\",\"genre\":\"Roguelike\",\"rating\":9.5,\"status\":\"backlog\"}"
```

**PUT – update**

```bash
curl -X PUT http://localhost:8089/api/games/<GAME_ID> ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Hades II\",\"platform\":\"Steam\",\"genre\":\"Roguelike\",\"rating\":10,\"status\":\"playing\"}"
```

**DELETE – remove**

```bash
curl -X DELETE http://localhost:8089/api/games/<GAME_ID>
```

(Replace `<GAME_ID>` with a real `_id` from MongoDB.)

---

## 8. Notes
* Cloud server on Render may be stopped after the course is finished.
