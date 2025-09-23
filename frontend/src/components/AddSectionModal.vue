<template>
  <div v-if="isVisible" class="modal-backdrop fade show"></div>
  <div v-if="isVisible" class="modal fade show d-block" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Añadir Nueva Sección</h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        <div class="modal-body">
          <div class="list-group">
            <a href="#" v-for="section in editorStore.sectionLibrary" :key="section.type" @click.prevent="selectSection(section)" class="list-group-item list-group-item-action">
              {{ capitalizeFirstLetter(section.type.replace(/-/g, ' ')) }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useEditorStore } from '../stores/editorStore'
  import { capitalizeFirstLetter } from '../utils/helpers'

  defineProps({ isVisible: Boolean })
  const emit = defineEmits(['close'])

  const editorStore = useEditorStore()

  function selectSection(sectionTemplate) {
    editorStore.addSection(sectionTemplate)
    close()
  }

  function close() {
    emit('close')
  }
</script>
