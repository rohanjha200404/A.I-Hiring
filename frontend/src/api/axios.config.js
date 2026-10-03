import axios from 'axios';
import { encryptPayload } from '../crypto.js';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Cache for the RSA Public Key
let cachedPublicKey = null;

const getPublicKey = async () => {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await axios.get(`${API_BASE_URL}/auth/public-key`);
  cachedPublicKey = res.data.publicKey;
  return cachedPublicKey;
};

// Add a request interceptor
api.interceptors.request.use(
  async (config) => {
    // Only encrypt POST or PUT requests containing data, and skip FormData (file uploads)
    if ((config.method === 'post' || config.method === 'put') && config.data && !(config.data instanceof FormData)) {
      try {
        const publicKey = await getPublicKey();
        const encryptedBody = encryptPayload(config.data, publicKey);
        config.data = encryptedBody;
      } catch (error) {
        console.error('Failed to encrypt payload:', error);
        return Promise.reject(error);
      }
    }
    
    // Attach JWT token if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
