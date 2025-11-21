// Load environment variables
require('dotenv').config();

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));


const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('cookie-session');
const bcrypt = require('bcrypt');           // used by User model helpers
const User = require('./models/User');
const Game = require('./models/Game');

const app = express();

// Google OAuth config from env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8089/auth/google/callback';

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true })); // handle form POST
app.use(express.json());                         // handle JSON
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(
  session({
    name: 'session',
    // use env secret in production, fallback only for local dev
    keys: [process.env.SESSION_SECRET || 'devSessionSecret3810'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  })
);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please define it in your environment (.env)');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Auth middleware
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// ===== Auth routes =====

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/games');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/games');
  }

  let error = null;
  if (req.query.error === 'google') {
    error = 'Google login failed. Please try again or use username/password.';
  }

  const success = req.query.success;
  res.render('login', { error, success });
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, provider: 'local' });

    if (!user) {
      return res.status(401).render('login', {
        error: 'Invalid username or password.',
        success: null
      });
    }

    const ok = await user.validatePassword(password);
    if (!ok) {
      return res.status(401).render('login', {
        error: 'Invalid username or password.',
        success: null
      });
    }

    req.session.user = {
      id: user._id,
      username: user.username
    };

    res.redirect('/games');
  } catch (err) {
    console.error(err);
    res.status(500).render('login', {
      error: 'Internal server error.',
      success: null
    });
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/games');
  }
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password || !confirmPassword) {
    return res
      .status(400)
      .render('register', { error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .render('register', { error: 'Passwords do not match.' });
  }

  try {
    const existing = await User.findOne({ username, provider: 'local' });
    if (existing) {
      return res
        .status(400)
        .render('register', { error: 'Username is already taken.' });
    }

    const passwordHash = await User.hashPassword(password);

    await User.create({
      username,
      passwordHash,
      provider: 'local'
    });

    // Do not auto-login. Show success on login page instead.
    return res.render('login', {
      error: null,
      success: 'Account created successfully. Please log in.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('register', { error: 'Internal server error.' });
  }
});

// ===== Google OAuth2 login =====

app.get('/auth/google', (req, res) => {
  // If already logged in, go straight to games
  if (req.session && req.session.user) {
    return res.redirect('/games');
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    console.error('Google OAuth error:', error);
    return res.redirect('/login?error=google');
  }

  if (!code) {
    return res.redirect('/login?error=google');
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.id_token) {
      console.error('No id_token from Google:', tokenData);
      return res.redirect('/login?error=google');
    }

    // Decode id_token (JWT) payload
    const [, payloadPart] = tokenData.id_token.split('.');
    const payloadJson = Buffer.from(payloadPart, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    const googleId = payload.sub;
    const email = payload.email;
    const displayName = payload.name || email;

    // Find or create user
    let user = await User.findOne({ provider: 'google', googleId });

    if (!user) {
      user = await User.create({
        username: email,
        provider: 'google',
        googleId
      });
    }

    // Put into session (same shape as local login)
    req.session.user = {
      id: user._id,
      username: user.username || displayName
    };

    res.redirect('/games');
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect('/login?error=google');
  }
});

// ===== Game CRUD routes (protected) =====

// List games
app.get('/games', requireLogin, async (req, res) => {
  try {
    const games = await Game.find().sort({ title: 1 });
    res.render('games', { games, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading games');
  }
});

// Show "add new game" form
app.get('/games/add', requireLogin, (req, res) => {
  res.render('game-form', {
    mode: 'create',
    game: {},
    error: null
  });
});

// Handle create
app.post('/games/add', requireLogin, async (req, res) => {
  try {
    const { title, platform, genre, rating, status } = req.body;

    await Game.create({
      title,
      platform,
      genre,
      rating: rating ? parseFloat(rating) : 0,
      status
    });

    res.redirect('/games');
  } catch (err) {
    console.error(err);
    res.status(400);
    res.render('game-form', {
      mode: 'create',
      game: req.body,
      error: 'Failed to create game'
    });
  }
});

// Show edit form
app.get('/games/edit/:id', requireLogin, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).send('Game not found');
    }

    res.render('game-form', {
      mode: 'edit',
      game,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading game');
  }
});

// Handle update
app.post('/games/edit/:id', requireLogin, async (req, res) => {
  try {
    const { title, platform, genre, rating, status } = req.body;

    await Game.findByIdAndUpdate(
      req.params.id,
      {
        title,
        platform,
        genre,
        rating: rating ? parseFloat(rating) : 0,
        status
      },
      { runValidators: true }
    );

    res.redirect('/games');
  } catch (err) {
    console.error(err);
    res.status(400);
    res.render('game-form', {
      mode: 'edit',
      game: { ...req.body, _id: req.params.id },
      error: 'Failed to update game'
    });
  }
});

// Handle delete
app.post('/games/delete/:id', requireLogin, async (req, res) => {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.redirect('/games');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting game');
  }
});

// ===== RESTful API for Game (JSON) =====

// GET /api/games?status=playing&platform=steam&minRating=8
app.get('/api/games', async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.platform) {
      filter.platform = req.query.platform;
    }
    if (req.query.minRating) {
      filter.rating = { $gte: Number(req.query.minRating) };
    }

    const games = await Game.find(filter).sort({ title: 1 });
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// GET /api/games/:id
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /api/games
app.post('/api/games', async (req, res) => {
  try {
    const { title, platform, genre, rating, status } = req.body;

    const newGame = await Game.create({
      title,
      platform,
      genre,
      rating: rating ? parseFloat(rating) : 0,
      status
    });

    res.status(201).json(newGame);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create game' });
  }
});

// PUT /api/games/:id
app.put('/api/games/:id', async (req, res) => {
  try {
    const { title, platform, genre, rating, status } = req.body;

    const updated = await Game.findByIdAndUpdate(
      req.params.id,
      {
        title,
        platform,
        genre,
        rating: rating ? parseFloat(rating) : 0,
        status
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update game' });
  }
});

// DELETE /api/games/:id
app.delete('/api/games/:id', async (req, res) => {
  try {
    const deleted = await Game.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ message: 'Game deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Start server
const PORT = process.env.PORT || 8089;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

