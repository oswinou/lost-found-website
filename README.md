# Game Library – COMP3810SEF Group Project

A simple **Game Backlog Manager** built with **Node.js + Express + MongoDB (Mongoose) + EJS**.

Users can:

- Register / login with **username + password**
- Login with **Google OAuth 2.0**
- Manage a shared list of games (create / edit / delete)
- Access a **RESTful JSON API** for the game data

> Note: In the current version, the game list is **shared by all users** (not per-user library).

---

## 1. Tech Stack

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

## 2. Project Structure

```text
comp3810-game-library/
├─ server.js               # Main Express server
├─ package.json
├─ package-lock.json
├─ .gitignore
├─ models/
│  ├─ Game.js              # Game schema & model
│  └─ User.js              # User schema & model (local + Google)
├─ views/
│  ├─ login.ejs            # Login page (local + Google)
│  ├─ register.ejs         # Registration page
│  ├─ games.ejs            # Game list (CRUD UI)
│  └─ game-form.ejs        # Add / Edit game
└─ public/
   └─ styles.css           # Shared UI styles
````

---

## 3. Features

### Authentication

* **Local auth**

  * Users can register with a username + password
  * Passwords are hashed with `bcrypt` before storing in MongoDB
  * After successful login, user info is stored in a cookie session

* **Google OAuth 2.0**

  * “Login with Google” button on the login page
  * Uses Google ID token (verified against `https://oauth2.googleapis.com/tokeninfo`)
  * First-time Google login will auto-create a user in MongoDB

> Sessions are stored in cookies via `cookie-session`. Logging out clears the session.

### Game Library (UI)

After login, users see the **Game Library** page:

* List of all games in the shared library
* “Add New Game” to create a new entry
* “Edit” & “Delete” buttons for each row
* Nice, consistent UI with the same style as Login / Register pages

Each game has:

* `title` (string)
* `platform` (e.g. “Steam”, “PS5”)
* `genre` (e.g. “Action RPG”)
* `rating` (0–10, number)
* `status` (one of `backlog`, `playing`, `cleared`)

### RESTful JSON API

Public JSON API (no auth required, for demo and marking):

* `GET /api/games`
  Optional query parameters:

  * `status` – filter by status (`backlog`, `playing`, `cleared`)
  * `platform` – filter by platform
  * `minRating` – filter by rating ≥ given value

* `GET /api/games/:id` – get game by MongoDB `_id`

* `POST /api/games` – create a new game
  Body (JSON):

  ```json
  {
    "title": "Elden Ring",
    "platform": "PS5",
    "genre": "Action RPG",
    "rating": 10,
    "status": "cleared"
  }
  ```

* `PUT /api/games/:id` – update an existing game

* `DELETE /api/games/:id` – delete a game

---

## 4. Prerequisites

* Node.js **16+**
* npm
* A MongoDB Atlas cluster (connection string)
* A Google Cloud project with OAuth 2.0 credentials
  (Web Application type, redirect URI must include your host, e.g.
  `http://localhost:8089/auth/google/callback` in local dev)

---

## 5. Setup & Run (Local)

### 5.1 Clone and install

```bash
git clone https://github.com/oswinou/comp3810-game-library.git
cd comp3810-game-library
npm install
```

### 5.2 Environment variables

Create a `.env` file in the project root:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8089/auth/google/callback
```

> On Render / other cloud platforms, set the same names as environment variables in the dashboard.

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

## 6. Usage

### 6.1 Web UI

1. Open `http://localhost:8089`
2. You will be redirected to `/login`
3. **First use:**

   * Click **Register**, create a new username + password
   * After registration, you are redirected to login page with a green success message
4. Login either:

   * With your local account, or
   * Click **Login with Google** and complete Google sign-in
5. After successful login, you will see the **Game Library** page

On the Game Library page you can:

* Click **Add New Game** to create a new entry
* Click **Edit** to modify an existing game
* Click **Delete** to remove a game (with a confirmation dialog)

> All users share the same game list in this version.

### 6.2 REST API with curl (examples)

List all games:

```bash
curl http://localhost:8089/api/games
```

Filter by status and minRating:

```bash
curl "http://localhost:8089/api/games?status=playing&minRating=8"
```

Create a game:

```bash
curl -X POST http://localhost:8089/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Elden Ring",
    "platform": "PS5",
    "genre": "Action RPG",
    "rating": 10,
    "status": "cleared"
  }'
```

Update a game:

```bash
curl -X PUT http://localhost:8089/api/games/<GAME_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Elden Ring",
    "platform": "PS5",
    "genre": "Action RPG",
    "rating": 9.5,
    "status": "playing"
  }'
```

Delete a game:

```bash
curl -X DELETE http://localhost:8089/api/games/<GAME_ID>
```
