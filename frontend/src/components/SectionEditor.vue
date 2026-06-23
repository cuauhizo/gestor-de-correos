<template>
  <div class="card p-3 mb-3 section-card">
    <div class="section-header">
      <div class="section-controls d-flex align-items-center gap-1 flex-grow-1" @click="isCollapsed = !isCollapsed" style="cursor: pointer" title="Clic para expandir/colapsar">
        <span class="drag-handle" title="Arrastrar para reordenar">
          <i-bi-grip-vertical />
        </span>
        <h5 class="section-title text-dark">
          {{ formatSectionType(section.type) }}
        </h5>
      </div>
      <div class="section-controls d-flex align-items-center gap-2">
        <button @click="isCollapsed = !isCollapsed" class="btn btn-sm btn-outline-secondary">
          <i-bi-chevron-down v-if="isCollapsed" />
          <i-bi-chevron-up v-else />
        </button>
        <button v-if="authStore.isAdmin" @click="openStructureModal" :class="['btn', 'btn-sm', isEditingStructure ? 'btn-warning' : 'btn-outline-warning']" title="Editar HTML de la estructura">
          <i-bi-braces />
        </button>
        <button @click="$emit('duplicate')" class="btn btn-sm btn-outline-primary" title="Duplicar sección">
          <i-bi-files />
        </button>
        <button @click="$emit('delete')" class="btn btn-sm btn-outline-danger" title="Eliminar sección">
          <i-entypo:trash />
        </button>
      </div>
    </div>

    <div v-if="!isCollapsed" class="section-content">
      <template v-for="(value, key) in section.content" :key="key">
        <div v-if="!key.startsWith('image_')" class="mb-3" :data-editor-wrapper-key="`${section.id}-${key}`">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label :for="`${section.id}-${key}`" class="form-label fw-bold mb-0">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
          </div>
          <template v-if="isUrlField(key)">
            <input :id="`${section.id}-${key}`" :value="value" @input="updateContent(key, $event.target.value)" type="url" class="form-control" placeholder="Introduce una URL de destino" />
          </template>
          <template v-else>
            <TiptapEditor v-if="!htmlMode[key]" :modelValue="value" @update:modelValue="newValue => updateContent(key, newValue)" :showHtmlToggle="true" :isHtmlMode="htmlMode[key]" @toggle-html="toggleHtmlMode(key)" />

            <textarea v-else :value="value" @input="updateContent(key, $event.target.value)" class="form-control font-monospace" rows="10" placeholder="Introduce tu código HTML..."></textarea>

            <button v-if="htmlMode[key]" @click="toggleHtmlMode(key)" class="btn btn-sm btn-outline-secondary mt-2">
              <i-bi-eye />
              Ver Editor Visual
            </button>
          </template>
        </div>
      </template>
    </div>

    <teleport to="body">
      <div v-if="isEditingStructure" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.6); z-index: 1055">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content shadow-lg">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title">
                <i-bi-braces class="text-warning me-2" />
                Editar HTML de la Estructura -
                <span class="text-info">{{ formatSectionType(section.type) }}</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeStructureModal"></button>
            </div>
            <div class="modal-body bg-light">
              <div class="alert alert-warning small py-2 mb-3 shadow-sm border-warning">
                <i-iwwa:alert class="me-1" />
                <b>Advertencia Avanzada:</b>
                Si eliminas un placeholder
                <code v-pre>{{...}}</code>
                , su contenido se perderá. Si añades uno nuevo con este formato, aparecerá automáticamente en el editor visual al guardar.
              </div>

              <textarea v-model="tempHtml" class="form-control font-monospace bg-dark text-light p-3" rows="20" style="font-size: 14px; line-height: 1.5" placeholder="Pega aquí el HTML de la sección..."></textarea>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary" @click="closeStructureModal">Cancelar</button>
              <button type="button" class="btn btn-success px-4" @click="saveStructure">Aplicar Cambios HTML</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
  import { ref, defineExpose, reactive } from 'vue'
  import TiptapEditor from './TiptapEditor.vue'
  import { useAuthStore } from '../stores/auth.js'
  import { capitalizeFirstLetter } from '../utils/helpers.js'
  import { useEditorStore } from '../stores/editorStore.js'

  const props = defineProps({
    section: {
      type: Object,
      required: true,
    },
  })

  const emit = defineEmits(['delete', 'duplicate'])
  const authStore = useAuthStore()
  const editorStore = useEditorStore()
  const isCollapsed = ref(false)
  const htmlMode = reactive({})

  const setCollapsed = value => {
    isCollapsed.value = value
  }

  // VARIABLES Y FUNCIONES PARA EL MODAL HTML
  const isEditingStructure = ref(false)
  const tempHtml = ref('')

  const openStructureModal = () => {
    tempHtml.value = props.section.html
    isEditingStructure.value = true
  }

  const closeStructureModal = () => {
    isEditingStructure.value = false
    tempHtml.value = ''
  }

  const saveStructure = () => {
    updateStructure(tempHtml.value)
    closeStructureModal()
  }

  defineExpose({
    setCollapsed,
  })

  function updateContent(key, newValue) {
    editorStore.updateSectionContent(props.section.id, key, newValue)
  }

  function formatSectionType(type) {
    if (typeof type !== 'string') {
      return 'Sección'
    }
    return capitalizeFirstLetter(type.replace(/-/g, ' '))
  }

  function toggleHtmlMode(key) {
    htmlMode[key] = !htmlMode[key]
  }

  function isUrlField(key) {
    return key.includes('enlace') || key.endsWith('_url') || key === 'url'
  }

  function updateStructure(newHtml) {
    editorStore.updateSectionHtml(props.section.id, newHtml)
  }
</script>

<style scoped>
  .section-card {
    border: 1px solid #dee2e6;
    background-color: #f8f9fa;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e9ecef;
  }

  .section-title {
    margin: 0;
    font-size: 1.1rem;
  }

  .drag-handle {
    cursor: move;
    color: #6c757d;
    font-size: 1.2rem;
  }

  .section-title button {
    font-size: 1.1rem;
    color: #212529;
  }

  .font-monospace {
    font-family: 'Courier New', Courier, monospace;
    background-color: #282c34;
    color: #abb2bf;
  }

  /* Ilumina la sección completa si el usuario está interactuando con cualquier campo interno */
  .section-card:focus-within {
    border-color: #0d6efd !important;
    box-shadow:
      0 2px 6px rgba(13, 110, 253, 0.12),
      0 0 0 0.25rem rgba(13, 110, 253, 0.15) !important;
    background-color: #ffffff !important;
  }

  /* Opcional: Cambia el color del icono de arrastre cuando la sección esté activa */
  .section-card:focus-within .drag-handle {
    color: #0d6efd !important;
  }
</style>
