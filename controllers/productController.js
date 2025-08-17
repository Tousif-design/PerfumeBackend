const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// =======================
// Get all products
// =======================
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json(products);
  } catch (error) {
    console.error('Get products error:', error); // Full error logged
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

    return res.status(200).json(product);
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

        // Generate unique filename
        const filename = `base64-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
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

    return res.status(201).json(savedProduct);
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

    // Handle file upload via multer
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
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
    return res.status(200).json(product);
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

    await Product.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
