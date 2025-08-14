<template>
  <div class="card p-4 mt-5 mx-auto" style="max-width: 900px;">
    <h1 class="card-title text-center mb-4">Bienvenido al Creador de Correos</h1>

    <div v-if="loadingTemplates" class="text-center text-secondary">Cargando templates disponibles...</div>
    <div v-if="templatesError" class="text-center text-danger">{{ templatesError }}</div>

    <div v-if="!loadingTemplates && !templatesError">
      <div v-if="templates.length > 0" class="mb-4">
        <label for="selectTemplate" class="form-label d-block">Selecciona un Template:</label>
        <select id="selectTemplate" class="form-select" v-model="selectedTemplateId" @change="fetchSelectedTemplateDetails">
          <option value="" disabled>-- Selecciona un template --</option>
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }} (ID: {{ template.id }})
          </option>
        </select>
        <p v-if="!selectedTemplateId && !loadingTemplates" class="text-danger mt-2">Por favor, selecciona un template para crear un correo.</p>
      </div>
      <p v-else class="text-secondary">No hay templates disponibles. Por favor, <router-link to="/gestionar-templates">añade un template primero</router-link>.</p>

      <div v-if="selectedTemplateId && selectedTemplatePlaceholders.length > 0" class="p-4 border rounded bg-light mb-4 text-start">
        <h2 class="h5 border-bottom pb-2 mb-3">Contenido Inicial para {{ getTemplateName(selectedTemplateId) }}</h2>
        <div v-for="placeholder in selectedTemplatePlaceholders" :key="placeholder" class="mb-3">
          <label :for="`initial-${placeholder}`" class="form-label">{{ capitalizeFirstLetter(placeholder.replace(/_/g, ' ')) }}:</label>
          <template v-if="placeholder.includes('enlace_') || placeholder.includes('url_imagen_')">
            <input
              type="url"
              :id="`initial-${placeholder}`"
              v-model="initialContent[placeholder]"
              placeholder="Introduce URL"
              :class="['form-control', { 'is-invalid': initialContentErrors[placeholder] }]"
            />
          </template>
          <template v-else>
            <textarea
              :id="`initial-${placeholder}`"
              v-model="initialContent[placeholder]"
              placeholder="Introduce texto o HTML"
              :class="['form-control', { 'is-invalid': initialContentErrors[placeholder] }]"
            ></textarea>
          </template>
          <p v-if="initialContentErrors[placeholder]" class="invalid-feedback d-block">{{ initialContentErrors[placeholder] }}</p>
        </div>
      </div>
      <p v-else-if="selectedTemplateId && selectedTemplatePlaceholders.length === 0" class="text-secondary">Este template no contiene campos editables.</p>


      <button
        @click="createNewEmail"
        :disabled="!selectedTemplateId || isCreatingEmail || loadingTemplateDetails"
        class="btn btn-primary"
      >
        {{ isCreatingEmail ? 'Creando...' : 'Crear Nuevo Correo Editable' }}
      </button>
      <p v-if="newEmailUrl" class="text-success mt-3" style="word-break: break-all;">
        Enlace de edición: <a :href="newEmailUrl" target="_blank">{{ newEmailUrl }}</a>
      </p>
      <p v-if="creationError" class="text-danger mt-3">{{ creationError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '../services/api.js'; // Ajusta la ruta a tu servicio de axios
import { useRouter } from 'vue-router';
// Importa las funciones auxiliares comunes
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js';
import { useAuthStore } from '../stores/auth.js';


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


// Mueve getTemplateName aquí para que la plantilla lo use directamente
const getTemplateName = (id) => {
  const template = templates.value.find(t => t.id === id);
  return template ? template.name : 'Template Desconocido';
};

// --- Carga Inicial de Templates ---
const fetchTemplates = async () => {
  loadingTemplates.value = true;
  templatesError.value = null;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`);
    templates.value = response.data;
    if (templates.value.length > 0) {
      selectedTemplateId.value = templates.value[0].id;
      await fetchSelectedTemplateDetails();
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
    initialContent.value = {};
    return;
  }

  loadingTemplateDetails.value = true;
  templateDetailsError.value = null;
  initialContentErrors.value = {};

  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${selectedTemplateId.value}`);
    selectedTemplatePlaceholders.value = response.data.placeholders;

    const newInitialContent = {};
    selectedTemplatePlaceholders.value.forEach(placeholder => {
        if (placeholder.includes('enlace_') || placeholder.includes('url_imagen_')) {
            newInitialContent[placeholder] = '';
        } else {
            newInitialContent[placeholder] = '';
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
  initialContentErrors.value = {};

  if (!selectedTemplateId.value) {
    creationError.value = 'Por favor, selecciona un template para crear un correo.';
    return;
  }

  let hasValidationErrors = false;
  for (const placeholder of selectedTemplatePlaceholders.value) {
    const value = initialContent.value[placeholder] || '';

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
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable`, {
      template_id: selectedTemplateId.value,
      initial_content: initialContent.value
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

onMounted(fetchTemplates);
</script>

<style scoped>
/* El bloque de estilos CSS ya no es necesario aquí */
</style>