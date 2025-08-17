const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// =======================
// Utility function to validate image file exists
// =======================
const validateImageFile = (imageUrl) => {
  if (!imageUrl) return false;
  
  // Remove leading slash if present
  const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  const imagePath = path.join(__dirname, '..', cleanImageUrl);
  
  return fs.existsSync(imagePath);
};

// =======================
// Utility function to get full image URL
// =======================
const getFullImageUrl = (imageUrl, req) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If it's a relative path, make it absolute
  if (imageUrl.startsWith('/uploads/')) {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}${imageUrl}`;
  }
  
  return imageUrl;
};

// =======================
// Get all products
// =======================
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    
    // Validate and enhance image URLs
    const enhancedProducts = products.map(product => {
      const productObj = product.toObject();
      
      // Check if image file exists
      if (productObj.imageUrl) {
        const imageExists = validateImageFile(productObj.imageUrl);
        productObj.imageExists = imageExists;
        
        // Add full URL for frontend
        productObj.fullImageUrl = getFullImageUrl(productObj.imageUrl, req);
      }
      
      return productObj;
    });
    
    return res.status(200).json(enhancedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =======================
// Get single product
// =======================
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productObj = product.toObject();
    
    // Validate and enhance image URL
    if (productObj.imageUrl) {
      const imageExists = validateImageFile(productObj.imageUrl);
      productObj.imageExists = imageExists;
      productObj.fullImageUrl = getFullImageUrl(productObj.imageUrl, req);
    }

    return res.status(200).json(productObj);
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =======================
// Create product (handles both file uploads and base64)
// =======================
exports.createProduct = async (req, res) => {
  try {
    console.log('Incoming request body:', req.body);
    console.log('Incoming file:', req.file);

    const { title, description, rating, price, discount, imageUrl: imageUrlFromBody } = req.body;

    let imageUrl = '';

    // Handle file upload via multer
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      console.log('File uploaded, imageUrl set to:', imageUrl);
      
      // Verify file was created
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('Multer file created successfully. Size:', stats.size, 'bytes');
      } else {
        console.error('Multer file was not created!');
        return res.status(500).json({ message: 'Failed to save uploaded image' });
      }
    }
    // Handle base64 image from frontend
    else if (imageUrlFromBody && imageUrlFromBody.startsWith('data:image')) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Extract base64 data and file extension
        const matches = imageUrlFromBody.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid base64 image format');
        }

        const fileExtension = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const filename = `base64-${timestamp}-${randomString}.${fileExtension}`;
        const filePath = path.join(uploadsDir, filename);

        // Save file
        fs.writeFileSync(filePath, buffer);
        imageUrl = `/uploads/${filename}`;

        console.log('Base64 image saved as:', filePath);
        console.log('Base64 imageUrl set to:', imageUrl);
        
        // Verify file was created
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log('File created successfully. Size:', stats.size, 'bytes');
        } else {
          console.error('File was not created!');
          return res.status(500).json({ message: 'Failed to save base64 image' });
        }
      } catch (base64Error) {
        console.error('Error processing base64 image:', base64Error);
        return res.status(400).json({ message: 'Invalid image format' });
      }
    }

    if (!title || !rating || !price || !discount) {
      console.error('Missing required fields:', { title, description, rating, price, discount });
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Ensure we have an image URL
    if (!imageUrl) {
      console.error('No image URL generated from upload or base64 data');
      return res.status(400).json({ message: 'Image is required' });
    }

    // Validate that the image file exists before saving to database
    if (!validateImageFile(imageUrl)) {
      console.error('Image file does not exist after upload:', imageUrl);
      return res.status(500).json({ message: 'Failed to validate uploaded image' });
    }

    const newProduct = new Product({
      title,
      description,
      rating,
      price,
      discount,
      imageUrl
    });

    const savedProduct = await newProduct.save();
    console.log('Product saved successfully:', savedProduct);
    console.log('Final imageUrl value:', savedProduct.imageUrl);
    console.log('Full product object:', JSON.stringify(savedProduct, null, 2));

    // Return enhanced product with full image URL
    const productObj = savedProduct.toObject();
    productObj.fullImageUrl = getFullImageUrl(productObj.imageUrl, req);
    productObj.imageExists = true;

    return res.status(201).json(productObj);
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =======================
// Update product
// =======================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, rating, price, discount, imageUrl: imageUrlFromBody } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let imageUrl = product.imageUrl;
    let oldImagePath = null;

    // Store old image path for cleanup
    if (product.imageUrl) {
      oldImagePath = path.join(__dirname, '..', product.imageUrl.startsWith('/') ? product.imageUrl.slice(1) : product.imageUrl);
    }

    // Handle file upload via multer
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      
      // Verify new file was created
      const newFilePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (!fs.existsSync(newFilePath)) {
        return res.status(500).json({ message: 'Failed to save uploaded image' });
      }
    }
    // Handle base64 image update
    else if (imageUrlFromBody && imageUrlFromBody.startsWith('data:image')) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Extract base64 data and file extension
        const matches = imageUrlFromBody.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid base64 image format');
        }

        const fileExtension = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique filename
        const filename = `base64-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const filePath = path.join(uploadsDir, filename);

        // Save file
        fs.writeFileSync(filePath, buffer);
        imageUrl = `/uploads/${filename}`;

        console.log('Base64 image updated and saved as:', filePath);
        
        // Verify file was created
        if (!fs.existsSync(filePath)) {
          return res.status(500).json({ message: 'Failed to save updated image' });
        }
      } catch (base64Error) {
        console.error('Error processing base64 image update:', base64Error);
        return res.status(400).json({ message: 'Invalid image format' });
      }
    }

    const productFields = {
      title: title || product.title,
      description: description || product.description,
      rating: rating || product.rating,
      price: price || product.price,
      discount: discount || product.discount,
      imageUrl: imageUrl
    };

    product = await Product.findByIdAndUpdate(id, { $set: productFields }, { new: true });
    
    // Clean up old image file if it exists and is different from new image
    if (oldImagePath && oldImagePath !== path.join(__dirname, '..', imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl)) {
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('Old image file deleted:', oldImagePath);
        }
      } catch (cleanupError) {
        console.error('Error deleting old image file:', cleanupError);
        // Don't fail the update if cleanup fails
      }
    }

    // Return enhanced product
    const productObj = product.toObject();
    productObj.fullImageUrl = getFullImageUrl(productObj.imageUrl, req);
    productObj.imageExists = validateImageFile(productObj.imageUrl);

    return res.status(200).json(productObj);
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =======================
// Delete product
// =======================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated image file
    if (product.imageUrl) {
      try {
        const imagePath = path.join(__dirname, '..', product.imageUrl.startsWith('/') ? product.imageUrl.slice(1) : product.imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('Product image file deleted:', imagePath);
        }
      } catch (imageDeleteError) {
        console.error('Error deleting product image file:', imageDeleteError);
        // Continue with product deletion even if image deletion fails
      }
    }

    await Product.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =======================
// Get image status for all products
// =======================
exports.getImageStatus = async (req, res) => {
  try {
    const products = await Product.find({}, 'title imageUrl');
    const imageStatus = products.map(product => ({
      id: product._id,
      title: product.title,
      imageUrl: product.imageUrl,
      exists: validateImageFile(product.imageUrl),
      fullUrl: getFullImageUrl(product.imageUrl, req)
    }));
    
    return res.status(200).json(imageStatus);
  } catch (error) {
    console.error('Get image status error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
