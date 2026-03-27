import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function normalizeError(error) {
  const status = error?.response?.status;
  const payload = error?.response?.data;
  const message =
    payload?.message ||
    (Array.isArray(payload?.errors) ? payload.errors.join(', ') : null) ||
    error?.message ||
    'Request failed';

  return {
    ...error,
    status,
    message,
    details: payload,
  };
}

function unwrapPayload(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') {
    return {
      success: true,
      message: 'OK',
      payload: responseBody,
      raw: responseBody,
    };
  }

  if ('success' in responseBody) {
    return {
      ...responseBody,
      payload: responseBody.rows ?? responseBody.data ?? null,
      raw: responseBody,
    };
  }

  return {
    success: true,
    message: 'OK',
    payload: responseBody,
    raw: responseBody,
  };
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const unwrapped = unwrapPayload(response.data);
    // Ensure payload is not null if we expect rows inside it for crud
    if (unwrapped.success && !unwrapped.payload && response.data?.rows) {
       unwrapped.payload = response.data.rows;
    }
    return unwrapped;
  },
  (error) => Promise.reject(normalizeError(error))
);
