// frontend/src/stores/editorStore.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import axios from '../services/api'

export const useEditorStore = defineStore('editor', () => {
  // --- State ---
  const loading = ref(true)
  const error = ref(null)
  const templateHtml = ref('')
  const editableContent = ref({})
  const templateName = ref('')
  const isLocked = ref(false)
  const isSaving = ref(false)
  const hasUnsavedChanges = ref(false)

  const autoSaveStatus = reactive({
    text: 'Listo',
    class: 'bg-secondary',
  })

  // --- Actions ---

  // Carga el correo y su template, y lo bloquea para edición.
  async function loadAndLockEmail(uuid) {
    loading.value = true
    error.value = null
    try {
      // 1. Bloquear el correo
      await axios.post(`/api/emails-editable/${uuid}/lock`)
      isLocked.value = true

      // 2. Obtener los datos del correo
      const emailResponse = await axios.get(`/api/emails-editable/${uuid}`)
      const { template_id, content_json, template_name } = emailResponse.data
      editableContent.value = content_json
      templateName.value = template_name

      // 3. Obtener el HTML del template base
      const templateResponse = await axios.get(`/api/templates/${template_id}`)
      templateHtml.value = templateResponse.data.html_content

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Error al cargar el correo.'
      if (err.response?.status === 409) {
        // Si está bloqueado, el componente se encargará de redirigir
        return { success: false, isLockedError: true }
      }
      return { success: false }
    } finally {
      loading.value = false
    }
  }

  // Guarda el contenido del correo (usado para auto-guardado y guardado manual)
  async function saveEmail(uuid) {
    if (isSaving.value) return false
    isSaving.value = true
    autoSaveStatus.text = 'Guardando...'
    autoSaveStatus.class = 'bg-info'
    try {
      await axios.put(`/api/emails-editable/${uuid}`, {
        updated_content: editableContent.value,
      })
      hasUnsavedChanges.value = false
      autoSaveStatus.text = 'Cambios guardados'
      autoSaveStatus.class = 'bg-success'
      setTimeout(() => {
        if (!hasUnsavedChanges.value) {
          autoSaveStatus.text = 'Listo'
          autoSaveStatus.class = 'bg-secondary'
        }
      }, 2000)
      return true
    } catch (err) {
      console.error('Error en guardado:', err)
      autoSaveStatus.text = 'Error al guardar'
      autoSaveStatus.class = 'bg-danger'
      return false
    } finally {
      isSaving.value = false
    }
  }

  // Desbloquea el correo (se llama al salir de la página)
  async function unlockEmail(uuid) {
    if (!isLocked.value) return
    try {
      await axios.post(`/api/emails-editable/${uuid}/unlock`)
      isLocked.value = false
    } catch (err) {
      console.error('Error al liberar el bloqueo:', err)
    }
  }

  // Limpia el estado del store cuando se sale del editor
  function resetEditorState() {
    loading.value = true
    error.value = null
    templateHtml.value = ''
    editableContent.value = {}
    templateName.value = ''
    isLocked.value = false
    isSaving.value = false
    hasUnsavedChanges.value = false
    autoSaveStatus.text = 'Listo'
    autoSaveStatus.class = 'bg-secondary'
  }

  return {
    loading,
    error,
    templateHtml,
    editableContent,
    templateName,
    isLocked,
    isSaving,
    hasUnsavedChanges,
    autoSaveStatus,
    loadAndLockEmail,
    saveEmail,
    unlockEmail,
    resetEditorState,
  }
})
