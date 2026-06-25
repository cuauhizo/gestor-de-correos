// frontend/src/stores/editorStore.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useAuthStore } from './auth'
import axios from '../services/api'
import { v4 as uuidv4 } from 'uuid'
import { parseNewSectionContent, syncSectionContentWithHtml } from '../utils/htmlParser' // <-- IMPORTAMOS EL PARSER

export const useEditorStore = defineStore('editor', () => {
  // --- State ---
  const loading = ref(true)
  const error = ref(null)
  const templateName = ref('')
  const emailName = ref('')
  const editableContent = ref({ sections: [] })
  const isLocked = ref(false)
  const isSaving = ref(false)
  const hasUnsavedChanges = ref(false)
  const sectionLibrary = ref([])
  const isLoadingLibrary = ref(false)
  const isReadOnly = ref(false)

  const autoSaveStatus = reactive({ text: 'Listo', class: 'bg-secondary' })

  // --- Actions ---
  async function loadAndLockEmail(uuid) {
    loading.value = true
    error.value = null
    isReadOnly.value = false
    const authStore = useAuthStore()

    try {
      await axios.post(`/api/emails-editable/${uuid}/lock`)
      isLocked.value = true
    } catch (err) {
      if (err.response?.status === 409 && authStore.isAdmin) {
        isReadOnly.value = true
      } else {
        error.value = err.response?.data?.message || 'Error al cargar el correo.'
        if (err.response?.status === 409) return { success: false, isLockedError: true }
        return { success: false }
      }
    }

    try {
      const emailResponse = await axios.get(`/api/emails-editable/${uuid}`)
      const { template_id, content_json, template_name, email_name } = emailResponse.data
      templateName.value = template_name
      emailName.value = email_name || template_name

      if (Array.isArray(content_json.sections)) {
        editableContent.value = content_json
      } else {
        const templateResponse = await axios.get(`/api/templates/${template_id}`)
        editableContent.value = {
          sections: [
            {
              id: uuidv4(),
              type: 'contenido-heredado',
              html: templateResponse.data.html_content,
              content: content_json,
            },
          ],
        }
      }

      await fetchSectionLibrary()
      return { success: true }
    } catch (loadErr) {
      error.value = 'Error al cargar el contenido del correo.'
      return { success: false }
    } finally {
      loading.value = false
    }
  }

  async function saveEmail(uuid) {
    if (isSaving.value) return false
    isSaving.value = true
    autoSaveStatus.text = 'Guardando...'
    autoSaveStatus.class = 'bg-info'
    try {
      await axios.put(`/api/emails-editable/${uuid}`, { updated_content: editableContent.value, email_name: emailName.value })
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
      autoSaveStatus.text = 'Error al guardar'
      autoSaveStatus.class = 'bg-danger'
      return false
    } finally {
      isSaving.value = false
    }
  }

  async function unlockEmail(uuid) {
    if (!isLocked.value) return
    try {
      await axios.post(`/api/emails-editable/${uuid}/unlock`)
      isLocked.value = false
    } catch (err) {
      console.error(err)
    }
  }

  function resetEditorState() {
    loading.value = true
    error.value = null
    templateName.value = ''
    emailName.value = ''
    editableContent.value = { sections: [] }
    isLocked.value = false
    isSaving.value = false
    hasUnsavedChanges.value = false
    sectionLibrary.value = []
    autoSaveStatus.text = 'Listo'
    autoSaveStatus.class = 'bg-secondary'
  }

  async function fetchSectionLibrary() {
    isLoadingLibrary.value = true
    try {
      const response = await axios.get('/api/section-templates')
      sectionLibrary.value = response.data
    } catch (err) {
      sectionLibrary.value = []
    } finally {
      isLoadingLibrary.value = false
    }
  }

  // 👇 FUNCIÓN ULTRA LIMPIA GRACIAS AL PARSER 👇
  function addSection(sectionTemplate) {
    if (!sectionTemplate || !sectionTemplate.html_content) return

    const globalImgIndex = editableContent.value.sections.reduce((count, sec) => {
      return count + Object.keys(sec.content).filter(k => k.startsWith('image_')).length
    }, 0)

    const { newContent } = parseNewSectionContent(sectionTemplate.html_content, globalImgIndex)

    editableContent.value.sections.push({
      id: uuidv4(),
      type: sectionTemplate.type_key,
      html: sectionTemplate.html_content,
      content: newContent,
    })

    handleContentChange()
  }

  function updateSectionContent(sectionId, contentKey, newValue) {
    const section = editableContent.value.sections.find(s => s.id === sectionId)
    if (section) {
      section.content[contentKey] = newValue
      handleContentChange()
    }
  }

  function handleContentChange() {
    if (!hasUnsavedChanges.value) {
      autoSaveStatus.text = 'Cambios sin guardar'
      autoSaveStatus.class = 'bg-warning'
    }
    hasUnsavedChanges.value = true
  }

  async function forceUnlockAndReload(uuid) {
    try {
      await axios.post(`/api/emails-editable/${uuid}/force-unlock`)
      await loadAndLockEmail(uuid)
      return { success: true, message: '¡Control tomado! Ahora puedes editar.' }
    } catch (err) {
      return { success: false, message: 'No se pudo forzar el desbloqueo.' }
    }
  }

  // 👇 FUNCIÓN ULTRA LIMPIA GRACIAS AL PARSER 👇
  function updateSectionHtml(sectionId, newHtml) {
    const section = editableContent.value.sections.find(s => s.id === sectionId)
    if (section) {
      section.html = newHtml
      section.content = syncSectionContentWithHtml(newHtml, section.content)
      handleContentChange()
    }
  }

  return {
    loading,
    error,
    editableContent,
    templateName,
    emailName,
    isLocked,
    isSaving,
    hasUnsavedChanges,
    autoSaveStatus,
    sectionLibrary,
    isLoadingLibrary,
    isReadOnly,
    addSection,
    loadAndLockEmail,
    saveEmail,
    unlockEmail,
    resetEditorState,
    forceUnlockAndReload,
    updateSectionContent,
    updateSectionHtml,
  }
})
