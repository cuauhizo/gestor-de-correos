// frontend/src/stores/auth.js
import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null, // Cargar de localStorage
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user && !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, credentials);
        this.user = response.data.user;
        this.token = response.data.token;

        // Guardar en localStorage para persistencia
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('token', this.token);

        // Redirigir a la página principal después del login
        router.push('/');
      } catch (error) {
        this.error = error.response?.data?.message || 'Error de conexión o credenciales inválidas.';
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Redirigir al login
      router.push('/login');
    },
    async register(userData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/register`, userData);
        this.error = null; // No hay error si el registro es exitoso
        return response.data; // Devolver la respuesta para mostrar un mensaje
      } catch (error) {
        this.error = error.response?.data?.message || 'Error de conexión o registro fallido.';
      } finally {
        this.loading = false;
      }
    },
  },
});