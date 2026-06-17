import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', // Asegúrate de que coincida con la URL de tu backend
  withCredentials: true, // ¡CRÍTICO! Permite que el navegador envíe y reciba las cookies
})

// Interceptor opcional para manejar respuestas (ej. si la sesión expira)
api.interceptors.response.use(
  response => response,
  error => {
    // Si el backend responde con 401 (No autorizado), podríamos redirigir al login
    if (error.response && error.response.status === 401) {
      // Limpiamos el usuario del localStorage si la sesión expiró
      localStorage.removeItem('user')

      // Solo redirigimos si no estamos ya en la página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
