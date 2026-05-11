import axios from 'axios';

const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const configuredBaseURL = import.meta.env.VITE_API_URL;
const shouldUseCurrentHost = import.meta.env.DEV && apiHost !== 'localhost' && apiHost !== '127.0.0.1';
const baseURL = shouldUseCurrentHost ? `http://${apiHost}:5000/api` : configuredBaseURL || `http://${apiHost}:5000/api`;
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem('accessToken');
    return Promise.reject(error);
  }
);

export const translateData = async (data, targetLanguage) => {
  const response = await api.post('/translation/translate', { data, targetLanguage });
  return response.data.data;
};

export default api;
