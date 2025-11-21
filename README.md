# Game Library Server

A simple full-stack web application built for the COMP3810SEF group project. 
It manages a personal game collection with:

- Web-based CRUD pages (EJS templates)
- Login / logout using cookie-based sessions
- RESTful JSON API for integration / testing
- MongoDB Atlas as the cloud database

---

## 1. Features

### 1.1 Authentication

- Login / logout implemented with `cookie-session`
- Hard-coded demo account:

  - **Username:** `admin` 
  - **Password:** `1234`

- All `/games` routes (web pages) are **protected** and require login

### 1.2 Game Management (Web CRUD)

Entity: **Game**

- `title` – game title (e.g. “Elden Ring”)
- `platform` – platform (e.g. “PS5”, “Steam”)
- `genre` – game genre (e.g. “Action RPG”)
- `rating` – numeric rating, 0–10
- `status` – current status: `backlog`, `playing`, or `cleared`

Implemented pages (EJS):

- `GET /login` – login form 
- `POST /login` – verify credentials, create session 
- `GET /logout` – clear session 

- `GET /games` 
  - List all games from MongoDB 
  - Accessible only after login 
  - Shows table with **Edit** / **Delete** actions 

- `GET /games/add` 
  - Show “Add New Game” form 

- `POST /games/add` 
  - Create new game document in MongoDB 

- `GET /games/edit/:id` 
  - Show “Edit Game” form for the selected game 

- `POST /games/edit/:id` 
  - Update selected game in MongoDB 

- `POST /games/delete/:id` 
  - Delete selected game from MongoDB 

### 1.3 RESTful JSON API

All API endpoints return JSON and are backed by the same MongoDB collection.

- `GET /api/games` 
  - Get all games 
  - Optional query parameters:
    - `status` (e.g. `status=playing`)
    - `platform` (e.g. `platform=Steam`)
    - `minRating` (e.g. `minRating=8`)

- `GET /api/games/:id` 
  - Get single game by MongoDB `_id`

- `POST /api/games` 
  - Create a new game 
  - JSON body:
    ```json
    {
      "title": "Elden Ring",
      "platform": "PS5",
      "genre": "Action RPG",
      "rating": 9.5,
      "status": "backlog"
    }
    ```

- `PUT /api/games/:id` 
  - Update a game (full update)

- `DELETE /api/games/:id` 
  - Delete a game

This API can be used with `curl`, Postman, or other front-end clients.

---

## 2. Tech Stack

- **Runtime:** Node.js (>= 16)
- **Web framework:** Express.js
- **View engine:** EJS
- **Database:** MongoDB Atlas (cloud MongoDB)
- **ODM:** Mongoose
- **Session:** `cookie-session`
- **Styling:** simple CSS (served from `/public/styles.css`)

---

## 3. Project Structure

```text
comp3810sef-group14/
├── models/
│   └── Game.js          # Mongoose schema & model for Game
├── routes/              # (optional; not heavily used in this version)
├── views/
│   ├── login.ejs        # login page
│   ├── games.ejs        # game list + Delete buttons
│   └── game-form.ejs    # shared form for Add / Edit
├── public/
│   └── styles.css       # basic styling for all pages
├── server.js            # main Express + Mongoose server
├── package.json
└── package-lock.json
````

---

## 4. Setup & Run (Local)

### 4.1 Prerequisites

* Node.js 16 or later
* npm
* A MongoDB Atlas cluster (connection string)

### 4.2 Clone and install

```bash
git clone <your-repo-url> comp3810sef-group14
cd comp3810sef-group14
npm install
```

### 4.3 Configure MongoDB connection

In `server.js`, set your MongoDB Atlas connection string:

```js
const MONGODB_URI = 'YOUR_MONGODB_URI_HERE';
mongoose.connect(MONGODB_URI)...
```

> For production deployment (e.g. Azure), this can be moved to an environment
> variable such as `process.env.MONGODB_URI`.

### 4.4 Run the server

```bash
node server.js
```

The server will start on **[http://localhost:8089](http://localhost:8089)** by default.

---

## 5. Usage

### 5.1 Web interface

1. Open `http://localhost:8089/login`

2. Login with:

   * Username: `admin`
   * Password: `1234`

3. You will be redirected to `http://localhost:8089/games`

4. From there you can:

   * Add new games
   * Edit existing games
   * Delete games
   * Logout

### 5.2 Example API calls (curl)

* Get all games:

  ```bash
  curl http://localhost:8089/api/games
  ```

* Filter games:

  ```bash
  curl "http://localhost:8089/api/games?status=playing&minRating=8"
  ```

* Get one game:

  ```bash
  curl http://localhost:8089/api/games/<GAME_ID>
  ```

* Create:

  ```bash
  curl -X POST http://localhost:8089/api/games \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Elden Ring",
      "platform": "PS5",
      "genre": "Action RPG",
      "rating": 9.5,
      "status": "backlog"
    }'
  ```

* Update:

  ```bash
  curl -X PUT http://localhost:8089/api/games/<GAME_ID> \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Elden Ring",
      "platform": "PS5",
      "genre": "Action RPG",
      "rating": 10,
      "status": "cleared"
    }'
  ```

* Delete:

  ```bash
  curl -X DELETE http://localhost:8089/api/games/<GAME_ID>
  ```

---

## 6. Possible Future Improvements

* Real user registration and login with a `User` collection
* Password hashing (e.g. using bcrypt)
* Role-based access control (admin vs normal user)
* More advanced filtering / search on the game list
* Responsive UI with a front-end framework or CSS framework
* Deployment to Azure App Service with environment variables

