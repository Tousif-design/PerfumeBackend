import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Axios instance with auth
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
}, (error) => Promise.reject(error));

// ==================
// Auth APIs
// ==================
export const loginUser = (data) => axiosInstance.post('/auth/login', data);
export const registerUser = (data) => axiosInstance.post('/auth/register', data);
export const getMe = () => axiosInstance.get('/auth/me');

// ==================
// Product APIs
// ==================
export const getProducts = () => axiosInstance.get('/products');
export const getProductById = (id) => axiosInstance.get(`/products/${id}`);

// Create or update with FormData for image
export const createProduct = (productData) => {
  const formData = new FormData();
  for (const key in productData) {
    formData.append(key, productData[key]);
  }
  return axiosInstance.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateProduct = (id, productData) => {
  const formData = new FormData();
  for (const key in productData) {
    formData.append(key, productData[key]);
  }
  return axiosInstance.patch(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteProduct = (id) => axiosInstance.delete(`/products/${id}`);
