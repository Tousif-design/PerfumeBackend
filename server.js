const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

// Import Image Middleware
const { ensureUploadsDirectory, cleanupOrphanedImages, backupImages } = require('./middleware/imageMiddleware');

const app = express();

// ==================
// Middleware
// ==================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://perfumefrontend.onrender.com' // ✅ Added your deployed frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload size limit for base64 images (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads directory exists on every request
app.use(ensureUploadsDirectory);

// Serve uploaded images statically with proper headers
app.use('/uploads', (req, res, next) => {
  // Add cache headers for images
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  next();
}, express.static(path.join(__dirname, 'uploads')));

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
// Health Check Endpoint
// ==================
app.get('/health', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const uploadsExists = fs.existsSync(uploadsDir);
  const uploadsFileCount = uploadsExists ? fs.readdirSync(uploadsDir).length : 0;
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uploads: {
      exists: uploadsExists,
      fileCount: uploadsFileCount,
      path: uploadsDir
    },
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================
// Image Management Endpoints
// ==================
app.get('/api/images/status', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const exists = fs.existsSync(uploadsDir);
    const files = exists ? fs.readdirSync(uploadsDir) : [];
    
    // Get file sizes
    const fileDetails = files.map(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });
    
    res.json({
      uploadsDir,
      exists,
      fileCount: files.length,
      totalSize: fileDetails.reduce((sum, file) => sum + file.size, 0),
      files: fileDetails
    });
  } catch (error) {
    console.error('Error getting image status:', error);
    res.status(500).json({ message: 'Error getting image status', error: error.message });
  }
});

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
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  
  // Run initial cleanup and backup
  setTimeout(async () => {
    try {
      await cleanupOrphanedImages({}, {}, () => {});
      await backupImages();
      console.log('✅ Initial image cleanup and backup completed');
    } catch (error) {
      console.error('❌ Error during initial cleanup:', error);
    }
  }, 5000); // Wait 5 seconds after server starts
});

// ==================
// Graceful Shutdown
// ==================
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  try {
    await backupImages();
    console.log('✅ Images backed up before shutdown');
  } catch (error) {
    console.error('❌ Error backing up images during shutdown:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  try {
    await backupImages();
    console.log('✅ Images backed up before shutdown');
  } catch (error) {
    console.error('❌ Error backing up images during shutdown:', error);
  }
  
  process.exit(0);
});
