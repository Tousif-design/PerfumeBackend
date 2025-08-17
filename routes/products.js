const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// =======================
// Multer storage setup
// =======================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // folder where images will be stored, ensure it exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix);
  }
});

// Make image upload optional
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// =======================
// Routes
// =======================

// Get all products (public)
router.get('/', productController.getAllProducts);

// Test endpoint to verify image serving
router.get('/test-image/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, '..', 'uploads', filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: 'Image not found', filename, imagePath });
  }
});

// Check uploads directory status
router.get('/uploads-status', (req, res) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const exists = fs.existsSync(uploadsDir);
  const files = exists ? fs.readdirSync(uploadsDir) : [];
  
  res.json({
    uploadsDir,
    exists,
    fileCount: files.length,
    files: files.slice(0, 10) // Show first 10 files
  });
});

// Get single product by ID (public)
router.get('/:id', productController.getProductById);

// Create product (admin only) - image upload is optional now
router.post('/', auth, upload.single('imageUrl'), productController.createProduct);

// Update product (admin only) - image upload is optional now
router.patch('/:id', auth, upload.single('imageUrl'), productController.updateProduct);

// Delete product (admin only)
router.delete('/:id', auth, productController.deleteProduct);

module.exports = router;
