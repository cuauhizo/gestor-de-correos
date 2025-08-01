<template>
  <div class="template-manager-container">
    <h1>Gestionar Templates de Correo</h1>

    <div v-if="formFeedbackMessage" :class="['form-feedback-message', formFeedbackType]">
      {{ formFeedbackMessage }}
    </div>

    <div ref="templateFormSection" class="template-form-section"> <h2>{{ editingTemplateId ? 'Editar Template Existente' : 'Añadir Nuevo Template' }}</h2>
      <form @submit.prevent="saveTemplate">
        <div class="form-group">
          <label for="templateName">Nombre del Template:</label>
          <input 
            type="text" 
            id="templateName" 
            v-model="currentTemplate.name" 
            required 
            placeholder="Ej: Newsletter Semanal, Promoción de Verano"
            :class="{ 'invalid': formErrors.name }"
          />
          <p v-if="formErrors.name" class="validation-error">{{ formErrors.name }}</p>
        </div>
        <div class="form-group">
          <label for="templateHtml">Contenido HTML del Template:</label>
          <textarea 
            id="templateHtml" 
            v-model="currentTemplate.html_content" 
            rows="15" 
            required 
            placeholder="Pega aquí el HTML completo de tu template. Asegúrate de incluir placeholders como {{titulo_principal}} donde quieras contenido editable."
            :class="{ 'invalid': formErrors.html_content }"
          ></textarea>
          <p v-if="formErrors.html_content" class="validation-error">{{ formErrors.html_content }}</p>
        </div>
        <div class="form-actions">
          <button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Guardando...' : (editingTemplateId ? 'Actualizar Template' : 'Guardar Nuevo Template') }}
          </button>
          <button type="button" @click="cancelEdit" v-if="editingTemplateId" class="cancel-button">Cancelar Edición</button>
        </div>
      </form>
    </div>

    <hr class="divider">

    <div class="template-list-section">
      <h2>Templates Existentes</h2>
      <div v-if="loadingTemplates" class="loading">Cargando templates...</div>
      <div v-if="templatesError" class="error">{{ templatesError }}</div>

      <p v-if="!loadingTemplates && !templatesError && templates.length === 0">No hay templates guardados aún.</p>
      
      <ul class="template-list">
        <li v-for="template in templates" :key="template.id" class="template-item">
          <div class="template-info">
            <strong>ID:</strong> {{ template.id }}<br>
            <strong>Nombre:</strong> {{ template.name }}
          </div>
          <div class="template-actions">
            <button @click="editTemplate(template.id)" class="action-button edit-button">Editar</button>
            <button @click="deleteTemplate(template.id)" class="action-button delete-button">Eliminar</button>
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
const formError = ref(null);
const formSuccess = ref(null);
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
    const response = await axios.get('http://localhost:3000/api/templates');
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
  formError.value = null; // Elimina este ref si ya no lo usas en el template
  formSuccess.value = null; // Elimina este ref
  formErrors.value = {}; // Resetear errores de validación

  try {
    let response;
    if (editingTemplateId.value) {
      response = await axios.put(`http://localhost:3000/api/templates/${editingTemplateId.value}`, currentTemplate.value);
    } else {
      response = await axios.post('http://localhost:3000/api/templates', currentTemplate.value);
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
  formError.value = null; // Elimina este ref
  formSuccess.value = null; // Elimina este ref
  formErrors.value = {};

  try {
    const response = await axios.get(`http://localhost:3000/api/templates/${id}`);
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
    await axios.delete(`http://localhost:3000/api/templates/${idToDelete}`);
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
.template-manager-container {
  padding: 20px;
  max-width: 900px;
  margin: 20px auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

h2 {
  color: #555;
  margin-top: 30px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  text-align: center;
}

.template-form-section, .template-list-section {
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #fcfcfc;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
  font-size: 0.95em;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1em;
}

.form-group textarea {
  min-height: 200px;
  resize: vertical;
  font-family: 'Courier New', Courier, monospace; /* Para que el HTML se vea mejor */
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

button[type="submit"] {
  background-color: #28a745;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

button[type="submit"]:hover {
  background-color: #218838;
}

button[type="submit"]:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.cancel-button:hover {
  background-color: #5a6268;
}

.divider {
  border: 0;
  height: 1px;
  background: #ccc;
  margin: 40px 0;
}

.template-list {
  list-style: none;
  padding: 0;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 10px;
  background-color: #f9f9f9;
  transition: background-color 0.2s ease;
}

.template-item:hover {
  background-color: #f0f0f0;
}

.template-info {
  flex-grow: 1;
  text-align: left;
  color: #555;
}

.template-info strong {
  color: #333;
}

.template-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.edit-button {
  background-color: #007bff;
  color: white;
}

.edit-button:hover {
  background-color: #0056b3;
}

.delete-button {
  background-color: #dc3545;
  color: white;
}

.delete-button:hover {
  background-color: #c82333;
}

.loading, .error {
  text-align: center;
  margin-top: 20px;
  font-size: 1.1em;
  color: #555;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
}

.success-message {
  color: #28a745;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
}

.validation-error {
  color: #dc3545;
  font-size: 0.85em;
  margin-top: 5px;
}

input.invalid, textarea.invalid {
  border-color: #dc3545;
}

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