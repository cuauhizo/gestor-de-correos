<template>
  <div class="card p-3 mb-3 section-card">
    <div class="section-header">
      <h5 class="section-title">
        <button @click="isCollapsed = !isCollapsed" class="btn btn-sm btn-link text-decoration-none me-2 p-0">
          <i-bi-chevron-down v-if="isCollapsed" />
          <i-bi-chevron-up v-else />
        </button>
        {{ formatSectionType(section.type) }}
      </h5>
      <!-- <div class="section-controls d-flex align-items-center gap-2">
        <button @click="$emit('moveUp')" :disabled="isFirst" class="btn btn-sm btn-outline-secondary" title="Mover arriba">
          <i-entypo:chevron-thin-up />
        </button>
        <button @click="$emit('moveDown')" :disabled="isLast" class="btn btn-sm btn-outline-secondary" title="Mover abajo">
          <i-entypo:chevron-thin-down />
        </button>
        <button @click="$emit('delete')" class="btn btn-sm btn-outline-danger" title="Eliminar sección">
          <i-entypo:trash />
        </button>
      </div> -->
      <div class="section-controls d-flex align-items-center gap-2">
        <span class="drag-handle" title="Arrastrar para reordenar">
          <i-bi-grip-vertical />
        </span>
        <button @click="$emit('delete')" class="btn btn-sm btn-outline-danger" title="Eliminar sección">
          <i-entypo:trash />
        </button>
      </div>
    </div>
    <div v-if="!isCollapsed" class="section-content">
      <template v-for="(value, key) in section.content" :key="key">
        <div v-if="!key.startsWith('image_')" class="mb-3" :data-editor-wrapper-key="`${section.id}-${key}`">
          <label :for="`${section.id}-${key}`" class="form-label fw-bold">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
          <template v-if="key.includes('enlace') || key.endsWith('_url') || key === 'url'">
            <input :id="`${section.id}-${key}`" :value="value" @input="updateContent(key, $event.target.value)" type="url" class="form-control" placeholder="Introduce una URL de destino" />
          </template>
          <template v-else>
            <TiptapEditor :modelValue="value" @update:modelValue="newValue => updateContent(key, newValue)" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
  import { ref, defineExpose } from 'vue'
  import TiptapEditor from './TiptapEditor.vue'
  import { capitalizeFirstLetter } from '../utils/helpers.js'
  import { useEditorStore } from '../stores/editorStore.js'

  const props = defineProps({
    section: {
      type: Object,
      required: true,
    },
  })

  // Actualizamos los emits para incluir los nuevos eventos
  const emit = defineEmits(['delete'])
  const editorStore = useEditorStore()
  const isCollapsed = ref(false)

  const setCollapsed = value => {
    isCollapsed.value = value
  }

  defineExpose({
    setCollapsed,
  })

  function updateContent(key, newValue) {
    // Llamamos directamente a la acción del store para actualizar el contenido.
    editorStore.updateSectionContent(props.section.id, key, newValue)
  }

  function formatSectionType(type) {
    // Si 'type' no es un string, devuelve un texto por defecto.
    if (typeof type !== 'string') {
      return 'Sección'
    }
    return capitalizeFirstLetter(type.replace(/-/g, ' '))
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
    cursor: move; /* O 'grab' */
    color: #6c757d;
    font-size: 1.2rem;
  }

  .section-title button {
    font-size: 1.1rem;
    color: #212529;
  }
</style>
