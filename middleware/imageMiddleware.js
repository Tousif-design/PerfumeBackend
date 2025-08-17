const fs = require('fs');
const path = require('path');

// =======================
// Ensure uploads directory exists
// =======================
const ensureUploadsDirectory = (req, res, next) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory:', uploadsDir);
    } catch (error) {
      console.error('❌ Failed to create uploads directory:', error);
      return res.status(500).json({ message: 'Failed to create uploads directory' });
    }
  }
  
  next();
};

// =======================
// Validate image file exists
// =======================
const validateImageFile = (imageUrl) => {
  if (!imageUrl) return false;
  
  const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  const imagePath = path.join(__dirname, '..', cleanImageUrl);
  
  return fs.existsSync(imagePath);
};

// =======================
// Clean up orphaned images
// =======================
const cleanupOrphanedImages = async (req, res, next) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const Product = require('../models/Product');
    
    if (!fs.existsSync(uploadsDir)) {
      return next();
    }
    
    const files = fs.readdirSync(uploadsDir);
    const products = await Product.find({}, 'imageUrl');
    const usedImages = products.map(p => {
      const url = p.imageUrl;
      return url.startsWith('/') ? url.slice(1) : url;
    });
    
    let cleanedCount = 0;
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const relativePath = `uploads/${file}`;
      
      if (!usedImages.includes(relativePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('🧹 Cleaned up orphaned image:', file);
          cleanedCount++;
        } catch (error) {
          console.error('Failed to delete orphaned image:', file, error);
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} orphaned images`);
    }
    
    next();
  } catch (error) {
    console.error('Error in cleanupOrphanedImages:', error);
    next(); // Continue even if cleanup fails
  }
};

// =======================
// Backup images (optional)
// =======================
const backupImages = async () => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const backupDir = path.join(__dirname, '..', 'backups', 'images', new Date().toISOString().split('T')[0]);
    
    if (!fs.existsSync(uploadsDir)) {
      return;
    }
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const files = fs.readdirSync(uploadsDir);
    let backedUpCount = 0;
    
    for (const file of files) {
      const sourcePath = path.join(uploadsDir, file);
      const destPath = path.join(backupDir, file);
      
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(sourcePath, destPath);
        backedUpCount++;
      }
    }
    
    if (backedUpCount > 0) {
      console.log(`💾 Backed up ${backedUpCount} images to ${backupDir}`);
    }
  } catch (error) {
    console.error('Error backing up images:', error);
  }
};

module.exports = {
  ensureUploadsDirectory,
  validateImageFile,
  cleanupOrphanedImages,
  backupImages
};
