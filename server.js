// Load environment variables
require('dotenv').config();


const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('cookie-session');
const bcrypt = require('bcrypt');           // used by User model helpers
const User = require('./models/User');
const Item = require('./models/Item');
const multer = require('multer');
const fs = require('fs');

const app = express();

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
    keys: [process.env.SESSION_SECRET || 'devSessionSecret3510'],
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

const uploadDir = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'item-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });
// ===== Auth routes =====

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/items');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/items');
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
      username: user.username,
      role: user.role || 'user'
    };

    res.redirect('/items');
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
    return res.redirect('/items');
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

// ===== Game CRUD routes (protected) =====

// Get item routes
app.get('/items', requireLogin, async (req, res) => {
  try {
    const { keyword, type, category, page, perPage } = req.query;
    const filter = {};

    if (type && type.trim() !== '') {
      filter.type = type.trim();
    }

    if (category && category.trim() !== '') {
      filter.category = new RegExp(category.trim(), 'i');
    }

    if (keyword && keyword.trim() !== '') {
      filter.$or = [
        { title: new RegExp(keyword.trim(), 'i') },
        { description: new RegExp(keyword.trim(), 'i') },
        { location: new RegExp(keyword.trim(), 'i') }
      ];
    }

    const currentPage = parseInt(page) > 0 ? parseInt(page) : 1;
    const itemsPerPage = [4, 8, 12].includes(parseInt(perPage)) ? parseInt(perPage) : 4;

    const totalItems = await Item.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);

    const items = await Item.find(filter)
      .populate('createdBy')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * itemsPerPage)
      .limit(itemsPerPage);

    res.render('items', {
      items,
      user: req.session.user,
      query: {
        keyword: keyword || '',
        type: type || '',
        category: category || '',
        perPage: itemsPerPage
      },
      pagination: {
        currentPage: safePage,
        totalPages,
        totalItems,
        itemsPerPage
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading items');
  }
});

app.get('/items/add', requireLogin, (req, res) => {
  res.render('item-form', {
    mode: 'create',
    item: {},
    error: null
  });
});

app.post('/items/add', requireLogin, upload.single('image'), async (req, res) => {
  try {
    const { title, type, category, description, location, date, contactInfo, imageUrl } = req.body;

    const imagePath = req.file ? '/uploads/' + req.file.filename : '';

    await Item.create({
      title,
      type,
      category,
      description,
      location,
      date,
      contactInfo,
      imageUrl,
      imagePath,
      createdBy: req.session.user.id
    });

    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(400).render('item-form', {
      mode: 'create',
      item: req.body,
      error: 'Failed to create item'
    });
  }
});

app.get('/items/edit/:id', requireLogin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).send('Item not found');

    const isAdmin = req.session.user.role === 'admin';
    const isOwner = item.createdBy && String(item.createdBy) === String(req.session.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).send('Permission denied');
    }

    res.render('item-form', {
      mode: 'edit',
      item,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading item');
  }
});

app.post('/items/edit/:id', requireLogin, upload.single('image'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).send('Item not found');

    const isAdmin = req.session.user.role === 'admin';
    const isOwner = item.createdBy && String(item.createdBy) === String(req.session.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).send('Permission denied');
    }

    const { title, type, category, description, location, date, contactInfo, imageUrl, status } = req.body;

    const updateData = {
      title,
      type,
      category,
      description,
      location,
      date,
      contactInfo,
      imageUrl,
      status
    };

    // If user uploads a new image, delete the old local image first
    if (req.file) {
      if (item.imagePath) {
        const oldImageFullPath = path.join(__dirname, 'public', item.imagePath.replace(/^\/+/, ''));

        if (fs.existsSync(oldImageFullPath)) {
          fs.unlinkSync(oldImageFullPath);
        }
      }

      updateData.imagePath = '/uploads/' + req.file.filename;
    }

    await Item.findByIdAndUpdate(req.params.id, updateData, { runValidators: true });

    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(400).render('item-form', {
      mode: 'edit',
      item: { ...req.body, _id: req.params.id },
      error: 'Failed to update item'
    });
  }
});

app.post('/items/delete/:id', requireLogin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).send('Item not found');

    const isAdmin = req.session.user.role === 'admin';
    const isOwner = item.createdBy && String(item.createdBy) === String(req.session.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).send('Permission denied');
    }

    if (item.imagePath) {
      const imageFullPath = path.join(__dirname, 'public', item.imagePath.replace(/^\/+/, ''));

      if (fs.existsSync(imageFullPath)) {
        fs.unlinkSync(imageFullPath);
      }
    }

    await Item.findByIdAndDelete(req.params.id);
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting item');
  }
});

app.post('/items/resolve/:id', requireLogin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).send('Item not found');

    const isAdmin = req.session.user.role === 'admin';
    const isOwner = item.createdBy && String(item.createdBy) === String(req.session.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).send('Permission denied');
    }

    await Item.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating item status');
  }
});

app.get('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('createdBy');

    if (!item) {
      return res.status(404).send('Item not found');
    }

    const isAdmin = req.session.user && req.session.user.role === 'admin';
    const isOwner =
      req.session.user &&
      item.createdBy &&
      String(item.createdBy._id) === String(req.session.user.id);

    res.render('item-detail', {
      item,
      user: req.session.user || null,
      isAdmin,
      isOwner
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading item detail');
  }
});

// Start server
const PORT = process.env.PORT || 8089;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

