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
      <div v-if="store.loading" class="text-center">Cargando...</div>
      <div v-if="store.error" class="text-center text-danger">{{ store.error }}</div>
      <ul class="list-group" v-else>
        <li v-for="section in store.sections" :key="section.id" class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>{{ section.name }}</strong>
            <br />
            <small class="text-muted">Clave: {{ section.type_key }}</small>
          </div>
          <div class="d-flex gap-2">
            <button @click="startEdit(section)" class="btn btn-primary btn-sm">Editar</button>
            <button @click="handleDelete(section.id)" class="btn btn-danger btn-sm">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useSectionTemplateStore } from '../stores/sectionTemplateStore.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import { useModalStore } from '../stores/modalStore.js'

  const store = useSectionTemplateStore()
  const feedbackStore = useFeedbackStore()
  const modalStore = useModalStore()

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
