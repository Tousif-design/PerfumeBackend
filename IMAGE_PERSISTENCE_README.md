# Image Persistence Solution

This document explains the improvements made to ensure images persist properly in your perfume backend application.

## 🚀 What Was Fixed

### Issues Identified:
1. **Images disappearing after server restart** - Images were not properly validated or persisted
2. **No cleanup of old images** - Orphaned images remained in uploads folder
3. **Missing error handling** - No validation if image files actually exist
4. **No backup mechanism** - Images could be lost during server restarts

### Solutions Implemented:

#### 1. **Enhanced Image Validation**
- Added `validateImageFile()` function to check if image files actually exist
- Images are validated before saving to database
- Enhanced error handling for missing images

#### 2. **Improved Image Serving**
- Added proper cache headers for images (1 year cache)
- Full URL generation for frontend consumption
- Better error handling for image serving

#### 3. **Automatic Cleanup**
- Orphaned images are automatically cleaned up
- Old images are deleted when products are updated
- Cleanup runs on server startup

#### 4. **Backup System**
- Images are automatically backed up to `backups/images/` directory
- Daily backups prevent data loss
- Backup runs on graceful shutdown

#### 5. **Enhanced API Responses**
- Products now include `imageExists` and `fullImageUrl` fields
- Better error messages for missing images
- Image status endpoint for monitoring

## 📁 File Structure

```
PerfumeBackend/
├── uploads/                    # Main image storage
├── backups/                    # Automatic backups
│   └── images/
│       └── YYYY-MM-DD/        # Daily backups
├── middleware/
│   └── imageMiddleware.js     # Image handling middleware
├── controllers/
│   └── productController.js   # Enhanced with image validation
├── routes/
│   └── products.js           # New image status routes
├── server.js                 # Enhanced with image middleware
└── test-image-persistence.js # Testing and fixing script
```

## 🔧 New Features

### 1. **Image Status Endpoint**
```bash
GET /api/products/image-status
```
Returns the status of all product images (admin only).

### 2. **Health Check Endpoint**
```bash
GET /health
```
Returns server health including uploads directory status.

### 3. **Image Management Endpoint**
```bash
GET /api/images/status
```
Returns detailed information about all uploaded images.

### 4. **Enhanced Product Responses**
Products now include:
- `imageExists`: Boolean indicating if image file exists
- `fullImageUrl`: Complete URL for frontend use
- `imageUrl`: Original relative path

## 🧪 Testing and Validation

### Run Image Persistence Test
```bash
node test-image-persistence.js test
```

This will:
- Check all products in database
- Verify image files exist
- Show detailed status report
- Provide test URLs for verification

### Fix Missing Images
```bash
node test-image-persistence.js fix
```

This will:
- Find products with missing images
- Attempt to match with existing files
- Update database records if matches found

## 🚀 Usage Examples

### 1. **Check Image Status**
```javascript
// Frontend code
const response = await fetch('/api/products');
const products = await response.json();

products.forEach(product => {
  if (product.imageExists) {
    // Image is available
    console.log('Image URL:', product.fullImageUrl);
  } else {
    // Image is missing
    console.log('Image missing for:', product.title);
  }
});
```

### 2. **Upload New Product**
```javascript
const formData = new FormData();
formData.append('title', 'Attar');
formData.append('description', 'Beautiful fragrance');
formData.append('rating', 4.5);
formData.append('price', 499);
formData.append('discount', 30);
formData.append('imageUrl', imageFile);

const response = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const product = await response.json();
console.log('Product created with image:', product.fullImageUrl);
```

### 3. **Monitor Image Health**
```javascript
// Check server health
const health = await fetch('/health').then(r => r.json());
console.log('Uploads directory:', health.uploads);

// Check image status
const imageStatus = await fetch('/api/images/status').then(r => r.json());
console.log('Total images:', imageStatus.fileCount);
```

## 🔒 Security Features

1. **File Type Validation** - Only image files are accepted
2. **Size Limits** - 50MB maximum file size
3. **Path Sanitization** - Prevents directory traversal attacks
4. **Admin Authentication** - Image management requires admin access

## 📊 Monitoring

### Log Messages to Watch For:
- `✅ Created uploads directory` - Directory created successfully
- `🧹 Cleaned up X orphaned images` - Cleanup completed
- `💾 Backed up X images` - Backup completed
- `❌ WARNING: Image file missing` - Missing image detected

### Health Check Indicators:
- Uploads directory exists
- File count in uploads
- MongoDB connection status
- Total size of uploaded images

## 🛠️ Troubleshooting

### Images Still Not Showing?

1. **Check server logs** for error messages
2. **Run the test script**:
   ```bash
   node test-image-persistence.js test
   ```
3. **Verify uploads directory** exists and has files
4. **Check file permissions** on uploads directory
5. **Test image URLs** directly in browser

### Missing Images After Restart?

1. **Check backups directory** for backed up images
2. **Run the fix script**:
   ```bash
   node test-image-persistence.js fix
   ```
3. **Verify .env file** has correct MongoDB URI
4. **Check disk space** on server

### Performance Issues?

1. **Enable image compression** in production
2. **Use CDN** for image serving
3. **Implement image resizing** for thumbnails
4. **Monitor disk usage** regularly

## 🎯 Best Practices

1. **Regular Monitoring** - Run test script weekly
2. **Backup Verification** - Check backup directory regularly
3. **Disk Space Management** - Monitor uploads directory size
4. **Error Logging** - Monitor server logs for image errors
5. **Frontend Validation** - Always check `imageExists` before displaying

## 🔄 Migration Guide

If you have existing products with missing images:

1. **Backup your database** first
2. **Run the test script** to identify issues
3. **Run the fix script** to attempt repairs
4. **Verify results** with test script again
5. **Update frontend** to use new response format

## 📞 Support

If you encounter issues:

1. Check this README first
2. Run the test script for diagnostics
3. Check server logs for error messages
4. Verify file permissions and disk space
5. Test image URLs directly in browser

The enhanced image persistence system should resolve the issue where images disappear after server restarts. Images are now properly validated, backed up, and monitored to ensure they remain available.
