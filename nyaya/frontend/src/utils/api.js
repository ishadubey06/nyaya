/**
 * Centralized API configuration that intelligently resolves the backend URL.
 * In development / localhost: defaults to http://localhost:8000
 * In production (Render / cloud deployment): automatically falls back to deployed Render backend
 */
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://nyaya-ai-backend-0fpo.onrender.com';
  }
  return 'http://localhost:8000';
};
