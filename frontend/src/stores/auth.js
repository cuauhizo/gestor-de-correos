import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: state => !!state.user,
    isAdmin: state => state.user?.role === 'admin',
  },
  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/api/login', credentials)

        this.user = response.data.user
        localStorage.setItem('user', JSON.stringify(this.user))

        // ✅ Importación dinámica del router: se carga solo cuando se ejecuta esta línea
        const { default: router } = await import('../router')

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
        await api.post('/api/logout')
      } catch (error) {
        console.error('Error al notificar al backend del cierre de sesión', error)
      } finally {
        this.user = null
        localStorage.removeItem('user')

        // ✅ Importación dinámica del router para el logout
        const { default: router } = await import('../router')
        router.push('/login')
      }
    },
  },
})
