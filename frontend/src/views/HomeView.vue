<template>
  <div class="card p-4 mt-5 mx-auto" style="max-width: 900px">
    <h1 class="card-title text-center mb-4">Bienvenido al Creador de Correos</h1>

    <div v-if="templateStore.loading" class="text-center text-secondary">Cargando templates disponibles...</div>
    <div v-if="templateStore.error" class="text-center text-danger">{{ templateStore.error }}</div>

    <div v-if="!templateStore.loading && !templateStore.error">
      <div v-if="templateStore.templates.length > 0" class="mb-4">
        <label for="selectTemplate" class="form-label d-block">Selecciona un Template:</label>
        <select id="selectTemplate" class="form-select" v-model="selectedTemplateId" @change="fetchSelectedTemplateDetails">
          <option value="" disabled>-- Selecciona un template --</option>
          <option v-for="template in templateStore.templates" :key="template.id" :value="template.id">{{ template.name }} (ID: {{ template.id }})</option>
        </select>
      </div>
      <p v-else-if="!templateStore.loading" class="text-secondary">
        No hay templates disponibles. Por favor,
        <router-link to="/gestionar-templates">añade un template primero</router-link>
        .
      </p>

      <div v-if="selectedTemplateId && Object.keys(initialContent).length > 0" class="p-4 border rounded bg-light mb-4 text-start">
        <h2 class="h5 border-bottom pb-2 mb-3">Contenido Inicial para {{ getTemplateName(selectedTemplateId) }}</h2>

        <div v-for="(value, key) in initialContent" :key="key" class="mb-3">
          <template v-if="!key.startsWith('image_')">
            <label :for="`initial-${key}`" class="form-label">{{ formatLabel(key) }}:</label>

            <template v-if="key.includes('enlace_')">
              <input type="url" :id="`initial-${key}`" v-model="initialContent[key]" placeholder="Introduce URL" :class="['form-control', { 'is-invalid': initialContentErrors[key] }]" />
            </template>
            <template v-else>
              <div v-if="key.toLowerCase().includes('titulo')">
                <textarea :id="`initial-${key}`" v-model="initialContent[key]" placeholder="Introduce texto o HTML" :class="['form-control', { 'is-invalid': initialContentErrors[key] }]" rows="1"></textarea>
              </div>
              <div v-else>
                <textarea :id="`initial-${key}`" v-model="initialContent[key]" placeholder="Introduce texto o HTML" :class="['form-control', { 'is-invalid': initialContentErrors[key] }]" rows="4"></textarea>
              </div>
            </template>
            <p v-if="initialContentErrors[key]" class="invalid-feedback d-block">{{ initialContentErrors[key] }}</p>
          </template>
        </div>
      </div>

      <button @click="createNewEmail" :disabled="!selectedTemplateId || isCreatingEmail" class="btn btn-primary">
        {{ isCreatingEmail ? 'Creando...' : 'Crear Nuevo Correo Editable' }}
      </button>
      <p v-if="creationError" class="text-danger mt-3">{{ creationError }}</p>
    </div>
  </div>
</template>

<script setup>
  // frontend/src/views/HomeView.vue
  import { ref, onMounted, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTemplateStore } from '../stores/templateStore.js'
  import { useEmailStore } from '../stores/emailStore.js'
  import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js'

  // --- Instancias de Stores ---
  const router = useRouter()
  const templateStore = useTemplateStore()
  const emailStore = useEmailStore()

  // --- Estado Local del Componente ---
  const selectedTemplateId = ref('')
  const initialContent = ref({})
  const initialContentErrors = ref({})
  const isCreatingEmail = ref(false)
  const creationError = ref(null)
  const LOREM_IPSUM_TITLE = 'Lorem Ipsum Dolor Sit Amet'
  const LOREM_IPSUM_PARAGRAPH =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'

  // --- Funciones Auxiliares ---
  const getTemplateName = id => templateStore.templates.find(t => t.id === id)?.name || '...'
  const formatLabel = key => capitalizeFirstLetter(key.replace(/_/g, ' '))

  // --- Lógica del Componente ---
  const fetchSelectedTemplateDetails = async () => {
    if (!selectedTemplateId.value) return
    initialContent.value = {}
    try {
      const html_content = await templateStore.getTemplateContent(selectedTemplateId.value)
      const newContent = {}

      // Extraer placeholders de texto como {{variable}}
      const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
      let textMatch
      while ((textMatch = textRegex.exec(html_content)) !== null) {
        const key = textMatch[1]
        // Si la clave del placeholder incluye "titulo", usamos el texto corto.
        // Si no, usamos el párrafo largo.
        if (key.toLowerCase().includes('titulo')) {
          newContent[key] = `${LOREM_IPSUM_TITLE}`
        } else {
          newContent[key] = `${LOREM_IPSUM_PARAGRAPH}`
        }
      }

      // Extraer URLs de imágenes (esta parte no cambia)
      const imgRegex = /<img[^>]+src="([^"]+)"/g
      let imgMatch
      let imgIndex = 0
      while ((imgMatch = imgRegex.exec(html_content)) !== null) {
        const key = `image_${imgIndex}`
        // Mantenemos la URL por defecto que viene en el template
        newContent[key] = imgMatch[1]
        imgIndex++
      }
      initialContent.value = newContent
    } catch (err) {
      creationError.value = 'Error al cargar los detalles del template.'
    }
  }

  const createNewEmail = async () => {
    creationError.value = null
    initialContentErrors.value = {}
    if (!selectedTemplateId.value) return

    // Validaciones (se mantienen en el componente, ya que son específicas de este formulario)
    let hasErrors = false
    for (const key in initialContent.value) {
      const value = initialContent.value[key] || ''
      if (key.startsWith('image_') || key.includes('enlace_')) {
        if (!value || !isValidUrl(value)) {
          initialContentErrors.value[key] = `La URL para ${key} no es válida.`
          hasErrors = true
        }
      } else {
        if (!getPlainTextFromHtml(value).trim()) {
          initialContentErrors.value[key] = 'El contenido no puede estar vacío.'
          hasErrors = true
        }
      }
    }
    if (hasErrors) {
      creationError.value = 'Por favor, corrige los errores.'
      return
    }

    isCreatingEmail.value = true
    const result = await emailStore.createEmail(selectedTemplateId.value, initialContent.value)
    if (result.success) {
      router.push({
        name: 'email-editor',
        params: { uuid: result.uuid },
      })
    } else {
      creationError.value = result.message
    }
    isCreatingEmail.value = false
  }

  // --- Watchers y Ciclo de Vida ---
  watch(selectedTemplateId, fetchSelectedTemplateDetails)

  onMounted(async () => {
    await templateStore.fetchTemplates()
    // Si hay templates, seleccionamos el primero por defecto
    if (templateStore.templates.length > 0) {
      selectedTemplateId.value = templateStore.templates[0].id
    }
  })
</script>
