// frontend/src/stores/emailStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from '../services/api'
import { useAuthStore } from './auth'
import { useRouter } from 'vue-router'

export const useEmailStore = defineStore('emails', () => {
  // --- State ---
  const emails = ref([])
  const loading = ref(false)
  const error = ref(null)

  // --- Stores & Router ---
  const authStore = useAuthStore()
  const router = useRouter()

  // --- Actions ---
  async function fetchEmails() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/emails-editable')
      emails.value = response.data
    } catch (err) {
      console.error('Error al cargar la lista de correos:', err)
      error.value = 'No se pudo cargar la lista de correos. Asegúrate de que el backend está funcionando.'
    } finally {
      loading.value = false
    }
  }

  async function createEmail(template_id, initial_content) {
    try {
      const response = await axios.post('/api/emails-editable', {
        template_id: template_id,
        initial_content: initial_content,
      })
      // Devolvemos el UUID del nuevo correo para poder construir la URL
      return { success: true, uuid: response.data.uuid }
    } catch (error) {
      console.error('Error al crear correo:', error)
      const message = error.response?.data?.message || 'Error al crear el correo.'
      return { success: false, message: message }
    }
  }

  async function deleteEmail(uuidToDelete) {
    try {
      await axios.delete(`/api/emails-editable/${uuidToDelete}`)
      // Actualizamos el estado local para reflejar el cambio inmediatamente
      emails.value = emails.value.filter(email => email.uuid !== uuidToDelete)
      return { success: true, message: 'Correo eliminado exitosamente.' }
    } catch (err) {
      console.error('Error al eliminar correo:', err)
      const message = err.response?.data?.message || 'Error al eliminar el correo.'
      return { success: false, message }
    }
  }

  async function handleEdit(email) {
    try {
      // Siempre intentamos entrar al editor.
      // La lógica de si es "solo lectura" o no, ya la maneja el editorStore.
      router.push({ name: 'email-editor', params: { uuid: email.uuid } })
      return { success: true }
    } catch (err) {
      // Este bloque ahora solo manejaría errores inesperados.
      return { success: false, message: 'Error al intentar navegar al editor.' }
    }
  }

  async function forceUnlockAndEdit(email) {
    try {
      // Llama a la nueva ruta del backend
      await axios.post(`/api/emails-editable/${email.uuid}/force-unlock`)
      // Inmediatamente intenta bloquearlo de nuevo para el admin y redirige
      return await handleEdit(email)
    } catch (err) {
      console.error('Error al forzar el desbloqueo:', err)
      return { success: false, message: 'No se pudo forzar el desbloqueo.' }
    }
  }

  async function forceUnlock(uuid) {
    try {
      await axios.post(`/api/emails-editable/${uuid}/force-unlock`)

      // Si tiene éxito, actualizamos el estado local para que la UI reaccione
      const email = emails.value.find(e => e.uuid === uuid)
      if (email) {
        email.is_locked = false
      }

      return { success: true, message: 'Correo desbloqueado exitosamente.' }
    } catch (err) {
      return { success: false, message: 'No se pudo forzar el desbloqueo.' }
    }
  }

  // --- Exponemos el estado y las acciones ---
  return {
    emails,
    loading,
    error,
    fetchEmails,
    createEmail,
    deleteEmail,
    handleEdit,
    forceUnlock,
  }
})
