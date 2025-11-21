const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    required: true,
    trim: true
  },
  genre: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  status: {
    type: String,
    enum: ['playing', 'cleared', 'backlog'],
    default: 'backlog'
  }
});

module.exports = mongoose.model('Game', gameSchema);

