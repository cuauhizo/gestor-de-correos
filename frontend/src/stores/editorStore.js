// frontend/src/stores/editorStore.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import axios from '../services/api'
import { v4 as uuidv4 } from 'uuid'

export const useEditorStore = defineStore('editor', () => {
  // --- State ---
  const loading = ref(true)
  const error = ref(null)
  const templateName = ref('')
  const editableContent = ref({ sections: [] })
  const isLocked = ref(false)
  const isSaving = ref(false)
  const hasUnsavedChanges = ref(false)
  const sectionLibrary = ref([])
  const isLoadingLibrary = ref(false)

  const autoSaveStatus = reactive({
    text: 'Listo',
    class: 'bg-secondary',
  })

  // --- Actions ---
  async function loadAndLockEmail(uuid) {
    loading.value = true
    error.value = null
    try {
      await axios.post(`/api/emails-editable/${uuid}/lock`)
      isLocked.value = true

      const emailResponse = await axios.get(`/api/emails-editable/${uuid}`)
      const { template_id, content_json, template_name } = emailResponse.data

      templateName.value = template_name
      // CORRECCIÓN: Simplemente asignamos el content_json que ya viene con la estructura de secciones correcta.
      editableContent.value = content_json

      // Cargamos la biblioteca de secciones
      await fetchSectionLibrary()

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Error al cargar el correo.'
      if (err.response?.status === 409) {
        return { success: false, isLockedError: true }
      }
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

  async function unlockEmail(uuid) {
    if (!isLocked.value) return
    try {
      await axios.post(`/api/emails-editable/${uuid}/unlock`)
      isLocked.value = false
    } catch (err) {
      console.error('Error al liberar el bloqueo:', err)
    }
  }

  // CORRECCIÓN: Asegúrate de que el reset también use la nueva estructura.
  function resetEditorState() {
    loading.value = true
    error.value = null
    templateName.value = ''
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
      console.error('No se pudo cargar la biblioteca de secciones', err)
      sectionLibrary.value = []
    } finally {
      isLoadingLibrary.value = false // <-- ACTUALIZA EL ESTADO
    }
  }

  function addSection(sectionTemplate) {
    if (!sectionTemplate || !sectionTemplate.html_content) {
      console.error('Plantilla de sección inválida:', sectionTemplate)
      return
    }

    // --- INICIO DE LA LÓGICA DE LOREM IPSUM ---
    const LOREM_IPSUM_TITLE = 'Lorem Ipsum Dolor Sit Amet'
    const LOREM_IPSUM_PARAGRAPH = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

    const newContent = {}
    const sectionHTML = sectionTemplate.html_content

    // 1. Parseo de texto con relleno Lorem Ipsum
    const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
    let textMatch
    while ((textMatch = textRegex.exec(sectionHTML)) !== null) {
      const key = textMatch[1].trim()
      if (key.toLowerCase().includes('titulo')) {
        newContent[key] = `${LOREM_IPSUM_TITLE}`
      } else {
        newContent[key] = `${LOREM_IPSUM_PARAGRAPH}`
      }
    }
    // --- FIN DE LA LÓGICA DE LOREM IPSUM ---

    // 2. Parseo de imágenes (se queda igual)
    const imgRegex = /<img[^>]*>/g
    let globalImgIndex = editableContent.value.sections.reduce((count, sec) => {
      return count + Object.keys(sec.content).filter(k => k.startsWith('image_')).length
    }, 0)

    const images = sectionHTML.match(imgRegex) || []
    images.forEach(() => {
      // Aquí podrías poner una URL de imagen de placeholder si quisieras
      newContent[`image_${globalImgIndex}`] = 'https://placehold.co/600x300'
      globalImgIndex++
    })

    const newSection = {
      id: uuidv4(),
      type: sectionTemplate.type_key,
      html: sectionTemplate.html_content,
      content: newContent,
    }

    editableContent.value.sections.push(newSection)
    handleContentChange()
  }

  // No olvides añadir handleContentChange al return del store si no lo has hecho
  // Esta función debe existir en tu EmailEditor.vue, pero necesitamos una referencia a ella o una
  // forma de emitir el evento de cambio desde el store.
  // Por ahora, lo más simple es replicar la lógica directamente en el store.
  function handleContentChange() {
    if (!hasUnsavedChanges.value) {
      autoSaveStatus.text = 'Cambios sin guardar'
      autoSaveStatus.class = 'bg-warning'
    }
    hasUnsavedChanges.value = true
    // La previsualización se actualizará reactivamente.
  }

  return {
    loading,
    error,
    editableContent,
    templateName,
    isLocked,
    isSaving,
    hasUnsavedChanges,
    autoSaveStatus,
    sectionLibrary,
    isLoadingLibrary,
    addSection,
    loadAndLockEmail,
    saveEmail,
    unlockEmail,
    resetEditorState,
  }
})
