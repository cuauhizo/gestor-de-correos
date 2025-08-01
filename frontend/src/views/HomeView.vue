<template>
  <div class="home-container">
    <h1>Bienvenido al Creador de Correos</h1>

    <div v-if="loadingTemplates" class="loading">Cargando templates disponibles...</div>
    <div v-if="templatesError" class="error">{{ templatesError }}</div>

    <div v-if="!loadingTemplates && !templatesError">
      <div v-if="templates.length > 0" class="template-selection">
        <label for="selectTemplate">Selecciona un Template:</label>
        <select id="selectTemplate" v-model="selectedTemplateId" @change="fetchSelectedTemplateDetails">
          <option value="" disabled>-- Selecciona un template --</option>
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }} (ID: {{ template.id }})
          </option>
        </select>
        <p v-if="!selectedTemplateId && !loadingTemplates" class="validation-error">Por favor, selecciona un template para crear un correo.</p>
      </div>
      <p v-else class="info-message">No hay templates disponibles. Por favor, <router-link to="/gestionar-templates">añade un template primero</router-link>.</p>
      
      <div v-if="selectedTemplateId && selectedTemplatePlaceholders.length > 0" class="initial-content-section">
        <h2>Contenido Inicial para {{ getTemplateName(selectedTemplateId) }}</h2>
        <div v-for="placeholder in selectedTemplatePlaceholders" :key="placeholder" class="form-group">
          <label :for="`initial-${placeholder}`">{{ capitalizeFirstLetter(placeholder.replace(/_/g, ' ')) }}:</label>
          <template v-if="placeholder.includes('enlace_') || placeholder.includes('url_imagen_')">
            <input 
              type="url" 
              :id="`initial-${placeholder}`" 
              v-model="initialContent[placeholder]" 
              placeholder="Introduce URL"
              :class="{ 'invalid': initialContentErrors[placeholder] }"
            />
          </template>
          <template v-else>
            <textarea 
              :id="`initial-${placeholder}`" 
              v-model="initialContent[placeholder]" 
              placeholder="Introduce texto o HTML"
              :class="{ 'invalid': initialContentErrors[placeholder] }"
            ></textarea>
          </template>
          <p v-if="initialContentErrors[placeholder]" class="validation-error">{{ initialContentErrors[placeholder] }}</p>
        </div>
      </div>
      <p v-else-if="selectedTemplateId && selectedTemplatePlaceholders.length === 0" class="info-message">Este template no contiene campos editables.</p>


      <button 
        @click="createNewEmail" 
        :disabled="!selectedTemplateId || isCreatingEmail || loadingTemplateDetails"
      >
        {{ isCreatingEmail ? 'Creando...' : 'Crear Nuevo Correo Editable' }}
      </button>
      <p v-if="newEmailUrl" class="success-message">
        Enlace de edición: <a :href="newEmailUrl" target="_blank">{{ newEmailUrl }}</a>
      </p>
      <p v-if="creationError" class="error-message">{{ creationError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js';


const router = useRouter();
const newEmailUrl = ref('');
const creationError = ref(null);
const isCreatingEmail = ref(false);

const templates = ref([]); // Lista de templates (id, name)
const loadingTemplates = ref(true);
const templatesError = ref(null);
const selectedTemplateId = ref(''); // ID del template seleccionado

const selectedTemplatePlaceholders = ref([]); // Placeholders del template seleccionado
const loadingTemplateDetails = ref(false);
const templateDetailsError = ref(null);
const initialContent = ref({}); // Contenido que el usuario introduce para los placeholders
const initialContentErrors = ref({}); // Errores de validación para el contenido inicial


const getTemplateName = (id) => {
  const template = templates.value.find(t => t.id === id);
  return template ? template.name : 'Template Desconocido';
};

// --- Carga Inicial de Templates ---
const fetchTemplates = async () => {
  loadingTemplates.value = true;
  templatesError.value = null;
  try {
    const response = await axios.get('http://localhost:3000/api/templates');
    templates.value = response.data;
    if (templates.value.length > 0) {
      selectedTemplateId.value = templates.value[0].id; // Seleccionar el primer template por defecto
      await fetchSelectedTemplateDetails(); // Cargar detalles del template por defecto
    }
  } catch (err) {
    console.error('Error al cargar templates:', err);
    templatesError.value = 'Error al cargar templates. Asegúrate de que el backend está funcionando.';
  } finally {
    loadingTemplates.value = false;
  }
};

// --- Carga de Detalles del Template Seleccionado ---
const fetchSelectedTemplateDetails = async () => {
  if (!selectedTemplateId.value) {
    selectedTemplatePlaceholders.value = [];
    initialContent.value = {}; // Limpiar contenido si no hay template seleccionado
    return;
  }

  loadingTemplateDetails.value = true;
  templateDetailsError.value = null;
  initialContentErrors.value = {}; // Resetear errores al cambiar de template

  try {
    // ESTA ES LA LLAMADA CLAVE PARA OBTENER LOS PLACEHOLDERS DEL BACKEND
    const response = await axios.get(`http://localhost:3000/api/templates/${selectedTemplateId.value}`);
    selectedTemplatePlaceholders.value = response.data.placeholders;

    // Inicializar initialContent con valores por defecto (vacío) para los nuevos placeholders
    const newInitialContent = {};
    selectedTemplatePlaceholders.value.forEach(placeholder => {
        // Podrías poner valores por defecto más inteligentes aquí si lo deseas
        // Por ejemplo, para enlaces, un placeholder de URL
        if (placeholder.includes('enlace_') || placeholder.includes('url_imagen_')) {
            newInitialContent[placeholder] = ''; // O 'https://via.placeholder.com/200' para imágenes
        } else {
            newInitialContent[placeholder] = ''; // O '<p>Contenido por defecto...</p>'
        }
    });
    initialContent.value = newInitialContent;

  } catch (err) {
    console.error('Error al cargar detalles del template:', err);
    templateDetailsError.value = 'Error al cargar detalles del template. Por favor, intenta de nuevo.';
    selectedTemplatePlaceholders.value = [];
  } finally {
    loadingTemplateDetails.value = false;
  }
};

// --- Creación de Nuevo Correo Editable ---
const createNewEmail = async () => {
  creationError.value = null;
  initialContentErrors.value = {}; // Limpiar errores de validación de contenido inicial

  if (!selectedTemplateId.value) {
    creationError.value = 'Por favor, selecciona un template para crear un correo.';
    return;
  }

  // Validar el contenido inicial antes de enviarlo
  let hasValidationErrors = false;
  for (const placeholder of selectedTemplatePlaceholders.value) {
    const value = initialContent.value[placeholder] || ''; // Obtener valor, si no existe, es vacío

    if (placeholder.includes('enlace_') || placeholder.includes('url_imagen_')) {
      if (!value) {
        initialContentErrors.value[placeholder] = 'Este campo de URL no puede estar vacío.';
        hasValidationErrors = true;
      } else if (!isValidUrl(value)) {
        initialContentErrors.value[placeholder] = 'Por favor, introduce una URL válida.';
        hasValidationErrors = true;
      }
    } else {
      const plainText = getPlainTextFromHtml(value);
      if (!plainText.trim()) {
        initialContentErrors.value[placeholder] = 'El contenido no puede estar vacío.';
        hasValidationErrors = true;
      }
    }
  }

  if (hasValidationErrors) {
    creationError.value = 'Por favor, corrige los errores del contenido inicial.';
    return;
  }


  isCreatingEmail.value = true;
  try {
    const response = await axios.post('http://localhost:3000/api/emails-editable', {
      template_id: selectedTemplateId.value,
      initial_content: initialContent.value // Ahora enviamos el contenido dinámico
    });
    const { uuid } = response.data;
    newEmailUrl.value = `${window.location.origin}/editar-correo/${uuid}`;
  } catch (error) {
    console.error('Error al crear nuevo correo editable:', error);
    creationError.value = error.response?.data?.message || 'Error al crear correo. Revisa la consola.';
  } finally {
    isCreatingEmail.value = false;
  }
};

onMounted(fetchTemplates); // Cargar los templates al montar
</script>

<style scoped>
.home-container {
  padding: 20px;
  max-width: 800px; /* Aumentado para acomodar más campos */
  margin: 50px auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 30px;
}

h2 {
    color: #555;
    margin-top: 30px;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

.template-selection {
  margin-bottom: 25px;
}

.template-selection label {
  display: block;
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #555;
}

.template-selection select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1em;
  background-color: #f9f9f9;
}

.initial-content-section {
    text-align: left; /* Alinea los campos a la izquierda */
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    background-color: #fcfcfc;
    margin-bottom: 20px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #333;
    font-size: 0.9em;
}

.form-group input[type="url"],
.form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
    font-size: 0.95em;
    min-height: 40px;
    resize: vertical;
}

.form-group textarea {
    min-height: 80px;
}

button {
  background-color: #007bff;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1em;
  transition: background-color 0.3s ease;
  margin-top: 20px;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading, .error {
  margin-top: 20px;
  font-size: 1.2em;
  color: #555;
}

.error {
  color: #dc3545;
  font-weight: bold;
}

.success-message {
  margin-top: 20px;
  color: #28a745;
  font-weight: bold;
  word-break: break-all;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  font-weight: bold;
}

.validation-error {
  color: #dc3545;
  font-size: 0.9em;
  margin-top: 5px;
  text-align: left; /* Alinea los errores a la izquierda */
}

input.invalid, textarea.invalid, select.invalid {
  border-color: #dc3545;
}

.info-message {
    color: #6c757d;
    margin-top: 20px;
}
</style>