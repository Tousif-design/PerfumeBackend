const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: false,
    default: ''
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 0,
    max: 5
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  discount: {
    type: Number,
    required: [true, 'Discount is required'],
    min: 0,
    max: 100
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL or uploaded file is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);
