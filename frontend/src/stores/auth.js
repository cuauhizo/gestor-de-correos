import { defineStore } from 'pinia'
import axios from 'axios'
import router from '../router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    loading: false,
    error: null,
  }),
  getters: {
    // La autenticación ahora depende únicamente de que tengamos un user cargado.
    // Si la cookie expira, el backend responderá 401 y el interceptor hará logout.
    isAuthenticated: state => !!state.user,
    isAdmin: state => state.user?.role === 'admin',
  },
  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null
      try {
        const response = await axios.post(`/api/login`, credentials)
        this.user = response.data.user

        // Solo guardamos el profile del usuario, el token ya está seguro en la Cookie
        localStorage.setItem('user', JSON.stringify(this.user))

        if (this.isAdmin) {
          router.push('/')
        } else {
          router.push('/lista-correos')
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Error de conexión o credenciales inválidas.'
      } finally {
        this.loading = false
      }
    },
    async logout() {
      try {
        await axios.post('/api/logout')
      } catch (error) {
        console.error('Error al cerrar sesión en el servidor', error)
      }

      this.user = null
      localStorage.removeItem('user')
      router.push('/login')
    },
    async register(userData) {
      this.loading = true
      this.error = null
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/register`, userData)
        this.error = null // No hay error si el registro es exitoso
        return response.data // Devolver la respuesta para mostrar un mensaje
      } catch (error) {
        this.error = error.response?.data?.message || 'Error de conexión o registro fallido.'
      } finally {
        this.loading = false
      }
    },
  },
})
