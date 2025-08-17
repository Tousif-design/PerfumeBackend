const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

// ==================
// Middleware
// ==================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow both common React dev ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload size limit for base64 images (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================
// Check Environment Variables
// ==================
if (!process.env.MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is not set in .env file");
  process.exit(1);
}

// ==================
// MongoDB Connection
// ==================
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'perfumedatabase', // Explicitly set DB name
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Stop server if DB connection fails
  });

// ==================
// Routes
// ==================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// ==================
// Error Handler
// ==================
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  
  // Handle payload too large error specifically
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      message: 'Image file is too large. Please use an image smaller than 10MB.',
      error: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  // Handle other errors
  res.status(500).json({ message: 'Something went wrong!' });
});

// ==================
// Start Server
// ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
