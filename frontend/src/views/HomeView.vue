<template>
  <div class="container py-4" style="max-width: 1000px">
    <h1 class="card-title text-center mb-1 fw-bold">Crear Nuevo Correo</h1>
    <p class="text-center text-muted mb-5">Selecciona una plantilla o empieza desde una hoja en blanco.</p>

    <div v-if="templateStore.loading" class="row g-4">
      <div class="col-md-4" v-for="i in 3" :key="'skel-' + i">
        <SkeletonLoader width="100%" height="160px" radius="12px" />
      </div>
    </div>

    <div v-else-if="templateStore.error" class="alert alert-danger text-center shadow-sm border-0">
      {{ templateStore.error }}
    </div>

    <div v-else>
      <div class="row g-4 mb-5">
        <div class="col-md-4">
          <div @click="selectTemplate('blank')" :class="['card h-100 shadow-sm border-2 text-center p-4 template-card', selectedTemplateId === 'blank' ? 'border-primary bg-white' : 'border-dashed bg-light']">
            <div class="card-body d-flex flex-column justify-content-center align-items-center">
              <i-bi-file-earmark-plus class="text-secondary mb-3" style="font-size: 3rem" />
              <h5 class="fw-bold text-dark mb-1">Desde Cero</h5>
              <p class="text-muted small mb-0">Lienzo completamente vacío sin estructura inicial.</p>
            </div>
          </div>
        </div>

        <div class="col-md-4" v-for="template in templateStore.templates" :key="template.id">
          <div @click="selectTemplate(template.id)" :class="['card h-100 shadow-sm border-2 text-center p-4 template-card bg-white', selectedTemplateId === template.id ? 'border-primary' : 'border-transparent']">
            <div class="card-body d-flex flex-column justify-content-center align-items-center">
              <i-bi-layout-text-window class="text-primary mb-3" style="font-size: 3rem" />
              <h5 class="fw-bold text-dark mb-1">{{ template.name }}</h5>
              <!-- <p class="text-muted small mb-0">ID de Plantilla: {{ template.id }}</p> -->
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedTemplateId" ref="configSection" class="card border-0 shadow-sm p-4 bg-white rounded-3 mb-4 border-top border-primary border-3">
        <div v-if="selectedTemplateId === 'blank'" class="text-center py-3">
          <h4 class="fw-bold mb-3">¿Confirmas crear un lienzo en blanco?</h4>
          <p class="text-muted mb-4 mx-auto" style="max-width: 500px">Entrarás directamente al editor sin secciones preestablecidas. Podrás arrastrar y construir tu correo de forma modular desde la biblioteca.</p>

          <div class="mb-4 mx-auto" style="max-width: 350px">
            <input type="text" class="form-control form-control-lg text-center" v-model="blankEmailName" placeholder="Asigna un nombre (opcional)..." @keyup.enter="createBlankEmail" />
          </div>

          <button @click="createBlankEmail" :disabled="isCreatingEmail" class="btn btn-primary btn-lg rounded-pill px-5 shadow-sm">
            <span v-if="isCreatingEmail" class="spinner-border spinner-border-sm me-2"></span>
            Crear Correo en Blanco
          </button>
        </div>

        <div v-else>
          <h4 class="fw-bold mb-4 border-bottom pb-2">Configuración de Plantilla: {{ getTemplateName(selectedTemplateId) }}</h4>

          <div class="mb-4 d-flex justify-content-center">
            <div class="btn-group p-1 bg-light rounded-pill border" role="group">
              <input type="radio" class="btn-check" name="creationMode" id="modeFast" value="fast" v-model="creationMode" />
              <label class="btn btn-sm rounded-pill px-4" for="modeFast">🪄 Creación Rápida</label>

              <input type="radio" class="btn-check" name="creationMode" id="modeCustom" value="custom" v-model="creationMode" />
              <label class="btn btn-sm rounded-pill px-4" for="modeCustom">📝 Formulario Inicial</label>
            </div>
          </div>

          <div v-if="creationMode === 'fast'" class="text-center py-3">
            <p class="text-muted mb-4 mx-auto" style="max-width: 500px">Se generará el correo instantáneamente inyectando textos de relleno editables (Lorem Ipsum) en los campos requeridos.</p>
            <button @click="createEmailWithMockData" :disabled="isCreatingEmail" class="btn btn-primary btn-lg rounded-pill px-5 shadow-sm">
              <span v-if="isCreatingEmail" class="spinner-border spinner-border-sm me-2"></span>
              Ir directo al Editor Visual
            </button>
          </div>

          <div v-if="creationMode === 'custom' && Object.keys(initialContent).length > 0" class="mt-2">
            <p class="text-muted small mb-4">Introduce los datos con los que deseas que inicialice el lienzo:</p>

            <div class="row">
              <div v-for="(value, key) in initialContent" :key="key" class="col-md-6 mb-3">
                <template v-if="!key.startsWith('image_')">
                  <label :for="`initial-${key}`" class="form-label fw-bold text-secondary small">{{ formatLabel(key) }}:</label>

                  <template v-if="key.includes('_enlace')">
                    <input type="url" :id="`initial-${key}`" v-model="initialContent[key]" placeholder="https://ejemplo.com" :class="['form-control', { 'is-invalid': initialContentErrors[key] }]" />
                  </template>
                  <template v-else>
                    <textarea
                      :id="`initial-${key}`"
                      v-model="initialContent[key]"
                      placeholder="Escribe el contenido de esta sección..."
                      :class="['form-control', { 'is-invalid': initialContentErrors[key] }]"
                      :rows="key.toLowerCase().includes('titulo') ? 1 : 3"></textarea>
                  </template>
                  <div v-if="initialContentErrors[key]" class="invalid-feedback d-block">{{ initialContentErrors[key] }}</div>
                </template>
              </div>
            </div>

            <div class="text-center mt-4">
              <button @click="createEmailWithCustomData" :disabled="isCreatingEmail" class="btn btn-success btn-lg rounded-pill px-5 shadow-sm">
                <span v-if="isCreatingEmail" class="spinner-border spinner-border-sm me-2"></span>
                Inicializar y Editar Correo
              </button>
            </div>
          </div>
        </div>

        <div v-if="creationError" class="alert alert-danger mt-4 text-center border-0 rounded shadow-sm">{{ creationError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTemplateStore } from '../stores/templateStore.js'
  import { useEmailStore } from '../stores/emailStore.js'
  import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js'
  import SkeletonLoader from '../components/SkeletonLoader.vue'

  const router = useRouter()
  const templateStore = useTemplateStore()
  const emailStore = useEmailStore()

  const selectedTemplateId = ref('')
  const configSection = ref(null)
  const creationMode = ref('fast') // 'fast' o 'custom'
  const initialContent = ref({})
  const initialContentErrors = ref({})
  const isCreatingEmail = ref(false)
  const creationError = ref(null)
  const blankEmailName = ref('')

  const getTemplateName = id => templateStore.templates.find(t => t.id === id)?.name || '...'
  const formatLabel = key => capitalizeFirstLetter(key.replace(/_/g, ' '))

  const selectTemplate = async id => {
    selectedTemplateId.value = id
    creationError.value = null
    initialContentErrors.value = {}

    if (id !== 'blank') {
      await fetchTemplatePlaceholders(id)
    }

    // Esperamos a que Vue termine de renderizar el nuevo bloque HTML en el DOM
    nextTick(() => {
      if (configSection.value) {
        // Hacemos el scroll suave automático hacia la parte superior de la sección
        configSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  // Analiza y extrae placeholders para el formulario manual
  const fetchTemplatePlaceholders = async templateId => {
    initialContent.value = {}
    try {
      const html_content = await templateStore.getTemplateContent(templateId)
      const newContent = {}

      const attributeRegex = /data-editor-attribute="([^"]+)"\s*[^>]*?\s*([a-zA-Z0-9_]+)="{{\s*([a-zA-Z0-9_]+)\s*}}"/g
      let attributeMatch
      while ((attributeMatch = attributeRegex.exec(html_content)) !== null) {
        newContent[attributeMatch[3]] = 'https://www.ejemplo.com'
      }

      const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
      let textMatch
      while ((textMatch = textRegex.exec(html_content)) !== null) {
        const key = textMatch[1]
        if (newContent[key] === undefined) {
          if (key.toLowerCase().includes('enlace') || key.toLowerCase().endsWith('_url')) {
            newContent[key] = 'https://www.ejemplo.com'
          } else if (key.toLowerCase().includes('titulo')) {
            newContent[key] = 'Lorem Ipsum Dolor'
          } else {
            newContent[key] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
          }
        }
      }

      const imgRegex = /<img[^>]+data-editor-key="([^"]+)"[^>]+src="([^"]+)"/g
      let imgMatch
      while ((imgMatch = imgRegex.exec(html_content)) !== null) {
        newContent[imgMatch[1]] = imgMatch[2]
      }
      initialContent.value = newContent
    } catch (err) {
      creationError.value = 'Error al cargar los detalles del template.'
    }
  }

  // FLUJO 1: Crear Correo Totalmente en Blanco (Desde Cero)
  const createBlankEmail = async () => {
    isCreatingEmail.value = true
    creationError.value = null
    try {
      // Mandamos un template_id nulo y contenido inicial vacío
      const finalName = blankEmailName.value.trim() || 'Lienzo en Blanco'
      const result = await emailStore.createEmail(null, {}, finalName)
      if (result.success) {
        router.push({ name: 'email-editor', params: { uuid: result.uuid } })
      } else {
        creationError.value = result.message
      }
    } catch (err) {
      creationError.value = 'Error al crear el correo en blanco. Verifica la base de datos.'
    } finally {
      isCreatingEmail.value = false
    }
  }

  // FLUJO 2: Creación Express (One-Click) usando Mock Data
  const createEmailWithMockData = async () => {
    isCreatingEmail.value = true
    creationError.value = null

    // Rellenamos el contenido automáticamente con Lorem Ipsum estructurado
    const formattedContent = {}
    for (const key in initialContent.value) {
      if (key.toLowerCase().includes('enlace') || key.toLowerCase().endsWith('_url')) {
        formattedContent[key] = 'https://www.ejemplo.com'
      } else if (key.toLowerCase().includes('titulo')) {
        formattedContent[key] = 'Lorem Ipsum Dolor Sit Amet'
      } else if (key.startsWith('image_')) {
        formattedContent[key] = initialContent.value[key]
      } else {
        formattedContent[key] = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>'
      }
    }

    const result = await emailStore.createEmail(selectedTemplateId.value, formattedContent)
    if (result.success) {
      router.push({ name: 'email-editor', params: { uuid: result.uuid } })
    } else {
      creationError.value = result.message
    }
    isCreatingEmail.value = false
  }

  // FLUJO 3: Creación Tradicional con Formulario Manual
  const createEmailWithCustomData = async () => {
    creationError.value = null
    initialContentErrors.value = {}

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
      creationError.value = 'Por favor, corrige los errores del formulario.'
      return
    }

    isCreatingEmail.value = true
    const result = await emailStore.createEmail(selectedTemplateId.value, initialContent.value)
    if (result.success) {
      router.push({ name: 'email-editor', params: { uuid: result.uuid } })
    } else {
      creationError.value = result.message
    }
    isCreatingEmail.value = false
  }

  onMounted(() => {
    templateStore.fetchTemplates()
  })
</script>

<style scoped>
  .template-card {
    cursor: pointer;
    transition:
      transform 0.25s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease;
  }
  .template-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
  }
  .border-dashed {
    border-style: dashed !important;
  }
  .btn-check:checked + .btn {
    background-color: #0d6efd !important;
    color: white !important;
    font-weight: bold;
  }
  .btn-group .btn {
    border: none;
    background: transparent;
    color: #6c757d;
  }
</style>
