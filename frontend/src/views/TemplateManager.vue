<template>
  <div class="template-manager-container">
    <h1>Gestión de Templates de Correo</h1>

    <div class="add-template-section">
      <h2>Añadir Nuevo Template</h2>
      <div class="form-group">
        <label for="templateName">Nombre del Template:</label>
        <input type="text" id="templateName" v-model="newTemplate.name" :class="{ 'invalid': newTemplateErrors.name }" />
        <p v-if="newTemplateErrors.name" class="validation-error">{{ newTemplateErrors.name }}</p>
      </div>
      <div class="form-group">
        <label for="templateHtml">Contenido HTML del Template:</label>
        <textarea id="templateHtml" v-model="newTemplate.html_content" :class="{ 'invalid': newTemplateErrors.html_content }"></textarea>
        <p v-if="newTemplateErrors.html_content" class="validation-error">{{ newTemplateErrors.html_content }}</p>
      </div>
      <button @click="addNewTemplate" :disabled="isSavingNewTemplate">
        {{ isSavingNewTemplate ? 'Guardando...' : 'Guardar Nuevo Template' }}
      </button>
      <div v-if="feedbackMessage" :class="['feedback-message', feedbackType]">
        {{ feedbackMessage }}
      </div>
    </div>

    <hr class="section-divider">

    <h2>Templates Existentes</h2>
    <div v-if="loadingTemplates" class="loading">Cargando templates...</div>
    <div v-if="templatesError" class="error">{{ templatesError }}</div>

    <div v-if="!loadingTemplates && !templatesError">
      <p v-if="templates.length === 0">No hay templates guardados aún.</p>
      
      <ul class="template-list">
        <li v-for="template in templates" :key="template.id" class="template-item">
          <div class="template-info">
            <strong>ID:</strong> {{ template.id }}<br>
            <strong>Nombre:</strong> {{ template.name }}<br>
            <strong>Creado:</strong> {{ formatDate(template.created_at) }}
          </div>
          </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const newTemplate = ref({
  name: '',
  html_content: ''
});
const newTemplateErrors = ref({});
const isSavingNewTemplate = ref(false);

const templates = ref([]);
const loadingTemplates = ref(true);
const templatesError = ref(null);

const feedbackMessage = ref('');
const feedbackType = ref('');
let feedbackTimeout = null;

// --- Funciones de Ayuda ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

const showFeedback = (message, type) => {
    feedbackMessage.value = message;
    feedbackType.value = type;

    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
    }
    feedbackTimeout = setTimeout(() => {
        feedbackMessage.value = '';
        feedbackType.value = '';
    }, 3000);
};

// --- Lógica de Gestión de Templates ---

// Cargar la lista de templates
const fetchTemplates = async () => {
  loadingTemplates.value = true;
  templatesError.value = null;
  try {
    const response = await axios.get('http://localhost:3000/api/templates');
    templates.value = response.data;
  } catch (err) {
    console.error('Error al cargar la lista de templates:', err);
    templatesError.value = 'Error al cargar templates. Asegúrate de que el backend está funcionando.';
  } finally {
    loadingTemplates.value = false;
  }
};

// Añadir un nuevo template
const addNewTemplate = async () => {
  newTemplateErrors.value = {}; // Resetear errores
  let hasErrors = false;

  if (!newTemplate.value.name.trim()) {
    newTemplateErrors.value.name = 'El nombre del template no puede estar vacío.';
    hasErrors = true;
  } else if (newTemplate.value.name.trim().length < 3 || newTemplate.value.name.trim().length > 255) {
    newTemplateErrors.value.name = 'El nombre debe tener entre 3 y 255 caracteres.';
    hasErrors = true;
  }

  if (!newTemplate.value.html_content.trim()) {
    newTemplateErrors.value.html_content = 'El contenido HTML no puede estar vacío.';
    hasErrors = true;
  }

  if (hasErrors) {
    showFeedback('Por favor, corrige los errores del formulario.', 'error');
    return;
  }

  isSavingNewTemplate.value = true;
  try {
    const response = await axios.post('http://localhost:3000/api/templates', newTemplate.value);
    showFeedback(`Template "${response.data.name}" creado con ID ${response.data.id}.`, 'success');
    
    // Limpiar formulario
    newTemplate.value.name = '';
    newTemplate.value.html_content = '';
    
    fetchTemplates(); // Recargar la lista de templates
  } catch (err) {
    console.error('Error al añadir nuevo template:', err);
    if (err.response && err.response.data && err.response.data.errors) {
        // Errores de validación de express-validator
        err.response.data.errors.forEach(e => {
            newTemplateErrors.value[e.path] = e.msg; // Suponiendo que 'path' es el nombre del campo
        });
        showFeedback('Error de validación al crear template.', 'error');
    } else if (err.response && err.response.data && err.response.data.message) {
        showFeedback(err.response.data.message, 'error'); // Mensaje personalizado del backend (ej. "ya existe")
    }
    else {
        showFeedback('Error al añadir template. Revisa la consola.', 'error');
    }
  } finally {
    isSavingNewTemplate.value = false;
  }
};

// Cargar templates al iniciar el componente
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

h1, h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.add-template-section {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 30px;
  background-color: #f9f9f9;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1em;
  background-color: #fff;
}

.form-group textarea {
  min-height: 200px;
  resize: vertical;
}

.add-template-section button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.add-template-section button:hover {
  background-color: #0056b3;
}

.add-template-section button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.section-divider {
  border: 0;
  height: 1px;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0));
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
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.template-info {
  flex-grow: 1;
  color: #555;
}

.template-info strong {
  color: #333;
}

.loading, .error {
  text-align: center;
  margin-top: 20px;
  font-size: 1.1em;
  color: #555;
}

.error {
  color: #dc3545;
  font-weight: bold;
}

.validation-error {
  color: #dc3545;
  font-size: 0.85em;
  margin-top: 5px;
}

input.invalid, textarea.invalid {
  border-color: #dc3545;
}

/* Feedback messages (copiados de EmailEditor.vue, asegúrate de que también estén en App.vue o en un componente común si quieres que aparezcan en todas las vistas) */
.feedback-message {
    position: fixed;
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
    animation: fade-in-up 0.3s forwards;
}

.feedback-message.success {
    background-color: #28a745;
}

.feedback-message.error {
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