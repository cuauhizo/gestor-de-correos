<template>
  <div class="container py-4" style="max-width: 900px">
    <h1 class="card-title text-center mb-4">Gestionar Plantillas de Sección</h1>

    <div class="card p-4 mb-4">
      <h2 class="h4 text-center mb-4">{{ editingSection.id ? 'Editar Plantilla de Sección' : 'Añadir Nueva Sección' }}</h2>
      <form @submit.prevent="handleSave">
        <div class="mb-3">
          <label for="name" class="form-label">Nombre Descriptivo:</label>
          <input type="text" id="name" v-model="editingSection.name" required class="form-control" placeholder="Ej: Noticia con Imagen a la Izquierda" />
        </div>
        <div class="mb-3">
          <label for="type_key" class="form-label">Clave Única (type_key):</label>
          <input type="text" id="type_key" v-model="editingSection.type_key" required class="form-control" placeholder="ej: noticia-img-izquierda (sin espacios, usar guiones)" />
        </div>
        <div class="mb-3">
          <label for="html_content" class="form-label">Contenido HTML del Bloque:</label>
          <textarea id="html_content" v-model="editingSection.html_content" required rows="10" class="form-control" placeholder="Pega aquí el HTML de la sección con sus placeholders {{...}}"></textarea>
        </div>
        <div class="d-flex gap-2 justify-content-center mt-3">
          <button type="submit" :disabled="isSaving" class="btn btn-success">
            {{ isSaving ? 'Guardando...' : editingSection.id ? 'Actualizar Sección' : 'Guardar Nueva Sección' }}
          </button>
          <button type="button" @click="resetForm" v-if="editingSection.id" class="btn btn-secondary">Cancelar Edición</button>
        </div>
      </form>
    </div>

    <hr class="my-5" />

    <div class="card p-4">
      <h2 class="h4 text-center mb-4">Biblioteca de Secciones</h2>

      <div class="mb-4" v-if="!store.loading && !store.error && store.sections.length > 0">
        <input 
          type="text" 
          v-model="searchQuery" 
          class="form-control" 
          placeholder="Buscar por nombre de sección o clave..." 
        />
      </div>
      
      <div v-if="store.loading">
        <ul class="list-group">
          <li v-for="i in 3" :key="'skel-sec-' + i" class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div class="flex-grow-1">
              <SkeletonLoader width="40%" height="20px" class="mb-1 d-block" />
              <SkeletonLoader width="30%" height="16px" class="d-block" />
            </div>
            <div class="d-flex gap-2">
              <SkeletonLoader width="65px" height="31px" radius="4px" />
              <SkeletonLoader width="75px" height="31px" radius="4px" />
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="store.error" class="text-center text-danger">{{ store.error }}</div>
      
      <div v-else>
        <p v-if="store.sections.length === 0" class="text-center text-secondary">
          No hay secciones guardadas aún.
        </p>
        <p v-else-if="filteredSections.length === 0" class="text-center text-secondary">
          No se encontraron resultados para "{{ searchQuery }}".
        </p>

        <ul class="list-group" v-else>
          <li v-for="section in filteredSections" :key="section.id" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center transition-hover py-3">
            <div>
              <strong class="text-primary fs-5">{{ section.name }}</strong>
              <br />
              <small class="text-muted">Clave: <strong>{{ section.type_key }}</strong></small>
            </div>
            <div class="d-flex gap-2">
              <button @click="startEdit(section)" class="btn btn-primary btn-sm">Editar</button>
              <button @click="handleDelete(section.id)" class="btn btn-outline-danger btn-sm">Eliminar</button>
            </div>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, computed } from 'vue' // <-- IMPORTAMOS computed
  import { useSectionTemplateStore } from '../stores/sectionTemplateStore.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import { useModalStore } from '../stores/modalStore.js'
  import SkeletonLoader from '../components/SkeletonLoader.vue'

  const store = useSectionTemplateStore()
  const feedbackStore = useFeedbackStore()
  const modalStore = useModalStore()

  // --- Estado para el buscador ---
  const searchQuery = ref('')

  // --- Computed para filtrar las secciones ---
  const filteredSections = computed(() => {
    if (!searchQuery.value) return store.sections
    const lowerCaseQuery = searchQuery.value.toLowerCase()
    
    return store.sections.filter(section => {
      const name = (section.name || '').toLowerCase()
      const typeKey = (section.type_key || '').toLowerCase()
      // Busca coincidencias en el nombre o en la clave única
      return name.includes(lowerCaseQuery) || typeKey.includes(lowerCaseQuery)
    })
  })

  const isSaving = ref(false)
  const editingSection = reactive({
    id: null,
    name: '',
    type_key: '',
    html_content: '',
  })

  const resetForm = () => {
    editingSection.id = null
    editingSection.name = ''
    editingSection.type_key = ''
    editingSection.html_content = ''
  }

  const handleSave = async () => {
    isSaving.value = true
    let result
    if (editingSection.id) {
      result = await store.updateSectionTemplate(editingSection.id, editingSection)
    } else {
      result = await store.createSectionTemplate(editingSection)
    }
    feedbackStore.show(result.message, result.success ? 'success' : 'error')
    if (result.success) {
      resetForm()
    }
    isSaving.value = false
  }

  const startEdit = section => {
    // Copiamos los datos de la sección al formulario reactivo
    Object.assign(editingSection, section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = id => {
    modalStore.show({
      title: 'Eliminar Plantilla de Sección',
      message: '¿Estás seguro? Eliminar esto no afectará a los correos que ya usan esta sección, pero no se podrá añadir de nuevo.',
      onConfirm: async () => {
        const result = await store.deleteSectionTemplate(id)
        feedbackStore.show(result.message, result.success ? 'success' : 'error')
      },
    })
  }

  onMounted(() => {
    store.fetchSectionTemplates()
  })
</script>

<style scoped>
  /* Efecto sutil al pasar el mouse por las filas */
  .transition-hover {
    transition: background-color 0.2s ease, transform 0.1s ease;
  }
  .transition-hover:hover {
    background-color: #f8f9fa;
    transform: translateX(2px);
    border-left: 4px solid #0d6efd;
  }
</style>