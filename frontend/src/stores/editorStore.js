// frontend/src/stores/editorStore.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useAuthStore } from './auth'
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
  const isReadOnly = ref(false)

  const autoSaveStatus = reactive({
    text: 'Listo',
    class: 'bg-secondary',
  })

  // --- Actions ---
  async function loadAndLockEmail(uuid) {
    loading.value = true
    error.value = null
    isReadOnly.value = false // Reseteamos por defecto
    const authStore = useAuthStore() // Obtenemos la instancia del auth store

    try {
      // 1. Intentamos bloquear el correo
      await axios.post(`/api/emails-editable/${uuid}/lock`)
      isLocked.value = true
    } catch (err) {
      // 2. Si falla porque está bloqueado (409) Y somos admin...
      if (err.response?.status === 409 && authStore.isAdmin) {
        console.log('El correo está bloqueado, entrando en modo de solo lectura para el admin.')
        isReadOnly.value = true
        // No lanzamos un error, continuaremos para cargar los datos.
      } else {
        // Para cualquier otro error, o si no somos admin, fallamos.
        error.value = err.response?.data?.message || 'Error al cargar el correo.'
        if (err.response?.status === 409) return { success: false, isLockedError: true }
        return { success: false }
      }
    }

    try {
      // 1. Obtenemos los datos del correo
      const emailResponse = await axios.get(`/api/emails-editable/${uuid}`)
      const { template_id, content_json, template_name } = emailResponse.data
      templateName.value = template_name

      if (Array.isArray(content_json.sections)) {
        // A. Es el formato NUEVO ({ sections: [...] })
        // Lo usamos tal cual.
        editableContent.value = content_json
      } else {
        // B. Es el formato ANTIGUO ({ "titulo": ... })
        console.warn('Detectado un correo con formato antiguo. Migrando a bloque único...')

        // 1. Cargamos el HTML del template maestro original
        const templateResponse = await axios.get(`/api/templates/${template_id}`)
        const templateHtml = templateResponse.data.html_content

        // 2. Creamos UN solo bloque "Heredado" que contiene TODO el contenido antiguo
        const legacySection = {
          id: uuidv4(),
          type: 'contenido-heredado',
          html: templateHtml, // El HTML de este bloque es el template maestro completo
          content: content_json, // El contenido es el objeto plano antiguo
        }

        // 3. Asignamos la nueva estructura
        editableContent.value = { sections: [legacySection] }
      }

      // 3. Cargamos la biblioteca de secciones (para poder añadir nuevos bloques)
      await fetchSectionLibrary() // Asumiendo que fetchSectionLibrary ya no necesita template_id

      return { success: true }
    } catch (loadErr) {
      console.error('Error cargando datos:', loadErr)
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
    // 1. Verificación de seguridad
    if (!sectionTemplate || !sectionTemplate.html_content) {
      console.error('Se intentó añadir una plantilla de sección inválida:', sectionTemplate)
      return
    }

    // --- Definición del contenido de relleno ---
    const LOREM_IPSUM_TITLE = 'Lorem Ipsum Dolor Sit Amet'
    const LOREM_IPSUM_PARAGRAPH = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    const PLACEHOLDER_URL = 'https://www.ejemplo.com/destino'
    const PLACEHOLDER_IMG_URL = 'https://placehold.co/600x300'

    const newContent = {}
    const sectionHTML = sectionTemplate.html_content

    // --- 2. Parseo del HTML de la sección ---

    // A. Parsear atributos editables (ej: data-editor-attribute="href" href="{{banner_enlace}}")
    // Esta regex busca placeholders que están *dentro* de atributos HTML
    const attributeRegex = /data-editor-attribute="[^"]+"\s*[^>]*?\s*\w+="{{\s*([a-zA-Z0-9_]+)\s*}}"/g
    let attributeMatch
    while ((attributeMatch = attributeRegex.exec(sectionHTML)) !== null) {
      const placeholderKey = attributeMatch[1] // ej: 'banner_enlace'
      newContent[placeholderKey] = PLACEHOLDER_URL
    }

    // B. Parsear placeholders de texto (ej: {{titulo_principal}})
    const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
    let textMatch
    while ((textMatch = textRegex.exec(sectionHTML)) !== null) {
      const key = textMatch[1].trim()

      // Solo rellenamos si no fue ya rellenado por el parser de atributos
      if (newContent[key] === undefined) {
        if (key.toLowerCase().includes('enlace') || key.toLowerCase().endsWith('_url')) {
          newContent[key] = PLACEHOLDER_URL
        } else if (key.toLowerCase().includes('titulo')) {
          newContent[key] = `${LOREM_IPSUM_TITLE}`
        } else {
          newContent[key] = `${LOREM_IPSUM_PARAGRAPH}`
        }
      }
    }

    // C. Parsear imágenes (<img>)
    const imgRegex = /<img[^>]*>/g

    // Contamos el total de imágenes que YA existen en el correo para evitar colisiones
    let globalImgIndex = editableContent.value.sections.reduce((count, sec) => {
      return count + Object.keys(sec.content).filter(k => k.startsWith('image_')).length
    }, 0)

    const imagesInThisSection = sectionHTML.match(imgRegex) || []
    imagesInThisSection.forEach(() => {
      newContent[`image_${globalImgIndex}`] = PLACEHOLDER_IMG_URL
      globalImgIndex++ // Incrementamos el contador global
    })

    // --- 3. Construir y añadir la nueva sección ---
    const newSection = {
      id: uuidv4(),
      type: sectionTemplate.type_key,
      html: sectionTemplate.html_content,
      content: newContent, // El objeto que acabamos de construir
    }

    editableContent.value.sections.push(newSection)

    // 4. Marcar que hay cambios sin guardar (para el autoguardado)
    if (!hasUnsavedChanges.value) {
      autoSaveStatus.text = 'Cambios sin guardar'
      autoSaveStatus.class = 'bg-warning'
    }
    hasUnsavedChanges.value = true
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
    // La previsualización se actualizará reactivamente.
  }

  async function forceUnlockAndReload(uuid) {
    try {
      // 1. Llama al endpoint para forzar el desbloqueo en el backend.
      await axios.post(`/api/emails-editable/${uuid}/force-unlock`)

      // 2. Si tiene éxito, vuelve a cargar el editor desde cero.
      // La función loadAndLockEmail ahora tomará el bloqueo para nosotros.
      await loadAndLockEmail(uuid)

      // Devolvemos éxito para que el componente pueda mostrar una notificación.
      return { success: true, message: '¡Control tomado! Ahora puedes editar.' }
    } catch (err) {
      console.error('Error al forzar el desbloqueo:', err)
      return { success: false, message: 'No se pudo forzar el desbloqueo.' }
    }
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
    isReadOnly,
    addSection,
    loadAndLockEmail,
    saveEmail,
    unlockEmail,
    resetEditorState,
    forceUnlockAndReload,
    updateSectionContent,
  }
})
