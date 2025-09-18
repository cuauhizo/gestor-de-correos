<template>
  <div class="container py-4" style="max-width: 900px">
    <h1 class="card-title text-center mb-4">Gestionar Templates de Correo</h1>
    <div v-if="formFeedbackMessage" :class="['form-feedback-message', formFeedbackType]">
      {{ formFeedbackMessage }}
    </div>
    <div ref="templateFormSection" class="card p-4 mb-4">
      <h2 class="h4 text-center mb-4">
        {{ editingTemplateId ? 'Editar Template Existente' : 'Añadir Nuevo Template' }}
      </h2>
      <form @submit.prevent="saveTemplate">
        <div class="mb-3">
          <label for="templateName" class="form-label">Nombre del Template:</label>
          <input type="text" id="templateName" v-model="currentTemplate.name" required placeholder="Ej: Newsletter Semanal, Promoción de Verano" class="form-control" :class="{ 'is-invalid': formErrors.name }" />
          <div v-if="formErrors.name" class="invalid-feedback">
            {{ formErrors.name }}
          </div>
        </div>
        <div class="mb-3">
          <label for="templateHtml" class="form-label">Contenido HTML del Template:</label>
          <textarea
            id="templateHtml"
            v-model="currentTemplate.html_content"
            rows="15"
            required
            placeholder="Pega aquí el HTML completo de tu template. Asegúrate de incluir placeholders como {{titulo_principal}} donde quieras contenido editable."
            class="form-control"
            :class="{ 'is-invalid': formErrors.html_content }"></textarea>
          <div v-if="formErrors.html_content" class="invalid-feedback">
            {{ formErrors.html_content }}
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-center mt-3">
          <button type="submit" :disabled="isSaving" class="btn btn-success">
            {{ isSaving ? 'Guardando...' : editingTemplateId ? 'Actualizar Template' : 'Guardar Nuevo Template' }}
          </button>
          <button type="button" @click="cancelEdit" v-if="editingTemplateId" class="btn btn-secondary">Cancelar Edición</button>
        </div>
      </form>
    </div>
    <hr class="divider my-5" />
    <div class="card p-4 template-list-section">
      <h2 class="h4 text-center mb-4">Templates Existentes</h2>
      <div v-if="templateStore.loading" class="text-center text-secondary">Cargando templates...</div>
      <div v-if="templateStore.error" class="text-center text-danger">
        {{ templateStore.error }}
      </div>
      <p v-if="!templateStore.loading && !templateStore.error && templateStore.templates.length === 0" class="text-center">No hay templates guardados aún.</p>
      <ul class="list-group">
        <li v-for="template in templateStore.templates" :key="template.id" class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>ID:</strong>
            {{ template.id }}
            <br />
            <strong>Nombre:</strong>
            {{ template.name }}
          </div>
          <div class="d-flex gap-2">
            <button @click="editTemplate(template.id)" class="btn btn-primary btn-sm">Editar</button>
            <button @click="deleteTemplateConfirmed(template.id)" class="btn btn-danger btn-sm">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useTemplateStore } from '../stores/templateStore.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'

  // --- Instancias ---
  const templateStore = useTemplateStore()
  const feedbackStore = useFeedbackStore()

  // --- Estado Local del Componente (solo para el formulario) ---
  const currentTemplate = ref({
    name: '',
    html_content: '',
  })
  const editingTemplateId = ref(null)
  const isSaving = ref(false)
  const formErrors = ref({})
  const templateFormSection = ref(null)

  // --- Lógica del Componente (ahora llama al store) ---

  const saveTemplate = async () => {
    isSaving.value = true
    formErrors.value = {}
    try {
      let response
      if (editingTemplateId.value) {
        response = await templateStore.updateTemplate(editingTemplateId.value, currentTemplate.value)
      } else {
        response = await templateStore.createTemplate(currentTemplate.value)
      }
      feedbackStore.show(response.message, 'success')
      cancelEdit()
    } catch (error) {
      if (error.errors) {
        error.errors.forEach(err => {
          formErrors.value[err.path] = err.msg
        })
        feedbackStore.show('Por favor, corrige los errores en el formulario.', 'error')
      } else {
        feedbackStore.show(error.message || 'Error al guardar el template.', 'error')
      }
    } finally {
      isSaving.value = false
    }
  }

  const editTemplate = async id => {
    formErrors.value = {}
    try {
      const templateToEdit = templateStore.templates.find(t => t.id === id)
      const html_content = await templateStore.getTemplateContent(id)

      currentTemplate.value.name = templateToEdit.name
      currentTemplate.value.html_content = html_content
      editingTemplateId.value = id

      if (templateFormSection.value) {
        templateFormSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch (error) {
      feedbackStore.show(error.message || 'Error al cargar el template para edición.', 'error')
    }
  }

  const deleteTemplateConfirmed = async idToDelete => {
    if (!confirm('¿Estás seguro de que quieres eliminar este template?')) return
    try {
      const response = await templateStore.deleteTemplate(idToDelete)
      feedbackStore.show(response.message, 'success')
    } catch (error) {
      feedbackStore.show(error.message || 'Error al eliminar el template.', 'error')
    }
  }

  const cancelEdit = () => {
    currentTemplate.value = { name: '', html_content: '' }
    editingTemplateId.value = null
    formErrors.value = {}
  }

  // --- Ciclo de Vida ---
  onMounted(() => {
    templateStore.fetchTemplates()
  })
</script>

<style scoped></style>
