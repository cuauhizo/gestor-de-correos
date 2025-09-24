<template>
  <div class="card p-3 mb-3 section-card">
    <div class="section-header">
      <h5 class="section-title">{{ formatSectionType(section.type) }}</h5>
      <div class="section-controls d-flex align-items-center gap-2">
        <button @click="$emit('moveUp')" :disabled="isFirst" class="btn btn-sm btn-outline-secondary" title="Mover arriba">↑</button>
        <button @click="$emit('moveDown')" :disabled="isLast" class="btn btn-sm btn-outline-secondary" title="Mover abajo">↓</button>
        <button @click="$emit('delete')" class="btn btn-sm btn-outline-danger" title="Eliminar sección">🗑️</button>
      </div>
    </div>
    <div class="section-content">
      <template v-for="(value, key) in section.content" :key="key">
        <div v-if="!key.startsWith('image_')" class="mb-3" :data-editor-wrapper-key="`${section.id}-${key}`">
          <label :for="`${section.id}-${key}`" class="form-label fw-bold">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
          <template v-if="key.includes('enlace_')">
            <input :id="`${section.id}-${key}`" :value="value" @input="updateContent(key, $event.target.value)" type="url" class="form-control" placeholder="Introduce una URL" />
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
  import TiptapEditor from './TiptapEditor.vue'
  import { capitalizeFirstLetter } from '../utils/helpers.js'

  const props = defineProps({
    section: {
      type: Object,
      required: true,
    },
    isFirst: {
      type: Boolean,
      default: false,
    },
    isLast: {
      type: Boolean,
      default: false,
    },
  })

  // Actualizamos los emits para incluir los nuevos eventos
  const emit = defineEmits(['update:content', 'delete', 'moveUp', 'moveDown'])

  function updateContent(key, newValue) {
    emit('update:content', { ...props.section.content, [key]: newValue })
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
</style>
