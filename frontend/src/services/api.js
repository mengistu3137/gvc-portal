import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // Adjust to your backend port

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  (config) => {
    // Note: In a real app, read token from Zustand store here
    // For simplicity in this file, we assume you might pass it or read from localStorage
    const token = localStorage.getItem('gvc-auth-storage');
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized logout logic here
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

export default apiClient;