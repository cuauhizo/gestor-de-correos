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
          
          <div class="mb-3" v-if="!editorStore.isLoadingLibrary && editorStore.sectionLibrary.length > 0">
            <input 
              type="text" 
              v-model="searchQuery" 
              class="form-control" 
              placeholder="Buscar sección por nombre o clave..." 
              autofocus
            />
          </div>

          <div v-if="editorStore.isLoadingLibrary" class="text-center text-secondary py-3">Cargando biblioteca...</div>
          
          <div v-else>
            <p v-if="editorStore.sectionLibrary.length === 0" class="text-center text-muted">
              No hay secciones en la biblioteca.
            </p>
            <p v-else-if="filteredSections.length === 0" class="text-center text-muted">
              No se encontraron resultados para "{{ searchQuery }}".
            </p>
            
            <div v-else class="list-group scrollable-list">
              <a 
                href="#" 
                v-for="section in filteredSections" 
                :key="section.type_key" 
                @click.prevent="selectSection(section)" 
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                <strong>{{ section.name }}</strong>
                <small class="text-muted">{{ section.type_key }}</small>
              </a>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue' // <-- IMPORTAMOS ref y computed
  import { useEditorStore } from '../stores/editorStore'
  import { capitalizeFirstLetter } from '../utils/helpers'

  defineProps({ isVisible: Boolean })
  const emit = defineEmits(['close'])

  const editorStore = useEditorStore()

  // --- Estado del buscador ---
  const searchQuery = ref('')

  // --- Computed para filtrar las secciones ---
  const filteredSections = computed(() => {
    if (!searchQuery.value) return editorStore.sectionLibrary
    
    const lowerCaseQuery = searchQuery.value.toLowerCase()
    return editorStore.sectionLibrary.filter(section => {
      const name = (section.name || '').toLowerCase()
      const typeKey = (section.type_key || '').toLowerCase()
      return name.includes(lowerCaseQuery) || typeKey.includes(lowerCaseQuery)
    })
  })

  function selectSection(sectionTemplate) {
    editorStore.addSection(sectionTemplate)
    close()
  }

  function close() {
    searchQuery.value = '' // Limpiamos el buscador al cerrar el modal
    emit('close')
  }
</script>

<style scoped>
/* Evita que el modal se haga infinitamente alto si hay muchas secciones */
.scrollable-list {
  max-height: 50vh;
  overflow-y: auto;
}
</style>