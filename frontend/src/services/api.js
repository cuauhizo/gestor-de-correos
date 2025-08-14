// frontend/src/services/api.js
import axios from 'axios';
import { useAuthStore } from '../stores/auth.js';

// Configura la base de URL para axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

// Interceptor para añadir el token a cada solicitud
axios.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout(); // Cerrar sesión si el token no es válido
    }
    return Promise.reject(error);
  }
);

export default axios;