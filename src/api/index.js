// src/api/index.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.attlarp.gr/api';

const api = axios.create({
  baseURL: API_URL,
});

// Intercept requests to attach the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;