<template>
  <div class="card p-4 mt-5 mx-auto" style="max-width: 800px;">
    <h1 class="card-title text-center mb-4">Gestionar Templates de Correo</h1>

    <div v-if="formFeedbackMessage" :class="['form-feedback-message', formFeedbackType]">
      {{ formFeedbackMessage }}
    </div>

    <div ref="templateFormSection" class="card p-4 mb-4">
      <h2 class="h4 text-center mb-4">{{ editingTemplateId ? 'Editar Template Existente' : 'Añadir Nuevo Template' }}</h2>
      <form @submit.prevent="saveTemplate">
        <div class="mb-3">
          <label for="templateName" class="form-label">Nombre del Template:</label>
          <input 
            type="text" 
            id="templateName" 
            v-model="currentTemplate.name" 
            required 
            placeholder="Ej: Newsletter Semanal, Promoción de Verano"
            class="form-control"
            :class="{ 'is-invalid': formErrors.name }"
          />
          <div v-if="formErrors.name" class="invalid-feedback">{{ formErrors.name }}</div>
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
            :class="{ 'is-invalid': formErrors.html_content }"
          ></textarea>
          <div v-if="formErrors.html_content" class="invalid-feedback">{{ formErrors.html_content }}</div>
        </div>
        <div class="d-flex gap-2 justify-content-center mt-3">
          <button type="submit" :disabled="isSaving" class="btn btn-success">
            {{ isSaving ? 'Guardando...' : (editingTemplateId ? 'Actualizar Template' : 'Guardar Nuevo Template') }}
          </button>
          <button type="button" @click="cancelEdit" v-if="editingTemplateId" class="btn btn-secondary">Cancelar Edición</button>
        </div>
      </form>
    </div>

    <hr class="divider my-5">

    <div class="card p-4 template-list-section">
      <h2 class="h4 text-center mb-4">Templates Existentes</h2>
      <div v-if="loadingTemplates" class="text-center text-secondary">Cargando templates...</div>
      <div v-if="templatesError" class="text-center text-danger">{{ templatesError }}</div>

      <p v-if="!loadingTemplates && !templatesError && templates.length === 0" class="text-center">No hay templates guardados aún.</p>
      
      <ul class="list-group">
        <li v-for="template in templates" :key="template.id" class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>ID:</strong> {{ template.id }}<br>
            <strong>Nombre:</strong> {{ template.name }}
          </div>
          <div class="d-flex gap-2">
            <button @click="editTemplate(template.id)" class="btn btn-primary btn-sm">Editar</button>
            <button @click="deleteTemplate(template.id)" class="btn btn-danger btn-sm">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { formatDate } from '../utils/helpers.js';
import { useFeedback } from '../composables/useFeedback.js';

const templates = ref([]);
const loadingTemplates = ref(true);
const templatesError = ref(null);

const currentTemplate = ref({ // Para el formulario de añadir/editar
  name: '',
  html_content: ''
});
const editingTemplateId = ref(null); // Guarda el ID del template que se está editando
const isSaving = ref(false);
const formErrors = ref({}); // Para errores de validación específicos de campos


// Nuevo ref para la sección del formulario (para el scroll)
const templateFormSection = ref(null);

// Usa el composable de feedback
// Aquí lo renombramos a formFeedbackMessage/Type para que no haya conflicto con el feedbackMessage/Type global si lo tuvieras
const { feedbackMessage: formFeedbackMessage, feedbackType: formFeedbackType, showFeedback: showFormFeedback } = useFeedback(); // <-- AÑADE ESTA LÍNEA


// Función para cargar la lista de templates
const fetchTemplates = async () => {
  loadingTemplates.value = true;
  templatesError.value = null;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`);
    templates.value = response.data;
  } catch (err) {
    console.error('Error al cargar templates:', err);
    templatesError.value = 'Error al cargar templates. Asegúrate de que el backend está funcionando.';
  } finally {
    loadingTemplates.value = false;
  }
};

// Función para guardar (añadir o actualizar) un template
// Modificar la función saveTemplate para usar el nuevo feedback
const saveTemplate = async () => {
  isSaving.value = true;
  formErrors.value = {}; // Resetear errores de validación

  try {
    let response;
    if (editingTemplateId.value) {
      response = await axios.put(`${import.meta.env.VITE_API_URL}/api/templates/${editingTemplateId.value}`, currentTemplate.value);
    } else {
      response = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates`, currentTemplate.value);
    }
    
    showFormFeedback(response.data.message, 'success'); // Usar el nuevo feedback
    currentTemplate.value = { name: '', html_content: '' };
    editingTemplateId.value = null;
    fetchTemplates();
  } catch (err) {
    console.error('Error al guardar template:', err);
    if (err.response && err.response.data && err.response.data.errors) {
      err.response.data.errors.forEach(error => {
        formErrors.value[error.path] = error.msg;
      });
      showFormFeedback('Por favor, corrige los errores en el formulario.', 'error'); // Usar el nuevo feedback
    } else {
      showFormFeedback(err.response?.data?.message || 'Error al guardar template. Revisa la consola.', 'error'); // Usar el nuevo feedback
    }
  } finally {
    isSaving.value = false;
  }
};

// Función para iniciar la edición de un template
// Modificar la función editTemplate para hacer scroll
const editTemplate = async (id) => {
  formErrors.value = {};

  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${id}`);
    currentTemplate.value.name = templates.value.find(t => t.id === id).name; // Obtener nombre de la lista ya cargada
    // Asegúrate de usar .value para los refs en Vue 3 Script Setup
    // currentTemplate.value.name = response.data.name; // Obtener nombre directamente de la respuesta si quieres
    currentTemplate.value.html_content = response.data.html_content;
    editingTemplateId.value = id;

    // SCROLL AUTOMÁTICO
    if (templateFormSection.value) {
      templateFormSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    console.error('Error al cargar template para edición:', err);
    showFormFeedback('Error al cargar template para edición. Revisa la consola.', 'error'); // Usar el nuevo feedback
  }
};

// Función para cancelar la edición
// Modificar la función cancelEdit para limpiar feedback
const cancelEdit = () => {
  currentTemplate.value = { name: '', html_content: '' };
  editingTemplateId.value = null;
  formFeedbackMessage.value = null; // Limpiar feedback al cancelar
  formFeedbackType.value = '';
  formErrors.value = {};
};

// Función para eliminar un template
// Modificar la función deleteTemplate para usar el nuevo feedback
const deleteTemplate = async (idToDelete) => {
  if (!confirm('¿Estás seguro de que quieres eliminar este template? Esta acción no se puede deshacer.')) {
    return;
  }
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/templates/${idToDelete}`);
    showFormFeedback('Template eliminado exitosamente.', 'success'); // Usar el nuevo feedback
    fetchTemplates();
  } catch (err) {
    console.error('Error al eliminar template:', err);
    showFormFeedback(err.response?.data?.message || 'Error al eliminar template. Revisa la consola.', 'error'); // Usar el nuevo feedback
  }
};

onMounted(fetchTemplates);
</script>

<style scoped>
/* Estilos para el feedback del formulario (similar al global, pero ajustado a la posición) */
.form-feedback-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    opacity: 0;
    transform: translateY(-20px);
    animation: fade-in-up 0.3s forwards;
    /* ============= */
    /* position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    opacity: 0;
    transform: translateY(-20px);
    animation: fade-in-up 0.3s forwards; */
}

.form-feedback-message.success {
    background-color: #28a745;
}

.form-feedback-message.error {
    background-color: #dc3545;
}


@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>