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
      </div>
      <p v-else class="text-secondary">No hay templates disponibles. Por favor, <router-link to="/gestionar-templates">añade un template primero</router-link>.</p>

      <div v-if="selectedTemplateId && Object.keys(initialContent).length > 0" class="p-4 border rounded bg-light mb-4 text-start">
        <h2 class="h5 border-bottom pb-2 mb-3">Contenido Inicial para {{ getTemplateName(selectedTemplateId) }}</h2>
        
        <div v-for="(value, key) in initialContent" :key="key" class="mb-3">
          <template v-if="!key.startsWith('image_')">
            <label :for="`initial-${key}`" class="form-label">{{ formatLabel(key) }}:</label>

            <template v-if="key.includes('enlace_')">
              <input
                type="url"
                :id="`initial-${key}`"
                v-model="initialContent[key]"
                placeholder="Introduce URL"
                :class="['form-control', { 'is-invalid': initialContentErrors[key] }]"
              />
            </template>
            <template v-else>
              <textarea
                :id="`initial-${key}`"
                v-model="initialContent[key]"
                placeholder="Introduce texto o HTML"
                :class="['form-control', { 'is-invalid': initialContentErrors[key] }]"
              ></textarea>
            </template>
            <p v-if="initialContentErrors[key]" class="invalid-feedback d-block">{{ initialContentErrors[key] }}</p>
          </template>
        </div>
      </div>

      <button @click="createNewEmail" :disabled="!selectedTemplateId || isCreatingEmail" class="btn btn-primary">
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
import axios from '../services/api.js';
import { useRouter } from 'vue-router';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js';

const router = useRouter();
const newEmailUrl = ref('');
const creationError = ref(null);
const isCreatingEmail = ref(false);
const templates = ref([]);
const loadingTemplates = ref(true);
const templatesError = ref(null);
const selectedTemplateId = ref('');
const initialContent = ref({});
const initialContentErrors = ref({});

const getTemplateName = (id) => templates.value.find(t => t.id === id)?.name || 'Template Desconocido';

const formatLabel = (key) => {
  if (key.startsWith('image_')) {
    const index = parseInt(key.split('_')[1], 10) + 1;
    return `Imagen ${index}`;
  }
  return capitalizeFirstLetter(key.replace(/_/g, ' '));
};

const fetchTemplates = async () => {
  try {
    const response = await axios.get('/api/templates');
    templates.value = response.data;
    if (templates.value.length > 0) {
      selectedTemplateId.value = templates.value[0].id;
      await fetchSelectedTemplateDetails();
    }
  } catch (err) {
    templatesError.value = 'Error al cargar templates.';
  } finally {
    loadingTemplates.value = false;
  }
};

const fetchSelectedTemplateDetails = async () => {
  if (!selectedTemplateId.value) return;
  
  initialContent.value = {};
  try {
    const response = await axios.get(`/api/templates/${selectedTemplateId.value}`);
    const { html_content } = response.data;
    const newContent = {};

    const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    let textMatch;
    while ((textMatch = textRegex.exec(html_content)) !== null) {
      newContent[textMatch[1]] = '';
    }

    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    let imgMatch;
    let imgIndex = 0;
    while ((imgMatch = imgRegex.exec(html_content)) !== null) {
      const key = `image_${imgIndex}`;
      newContent[key] = imgMatch[1];
      imgIndex++;
    }

    initialContent.value = newContent;
  } catch (err) {
    console.error('Error al cargar detalles del template:', err);
  }
};

const createNewEmail = async () => {
  creationError.value = null;
  initialContentErrors.value = {};
  if (!selectedTemplateId.value) return;

  let hasErrors = false;
  for (const key in initialContent.value) {
    const value = initialContent.value[key] || '';
    if (key.startsWith('image_') || key.includes('enlace_')) {
      if (!value || !isValidUrl(value)) {
        initialContentErrors.value[key] = `La URL para ${key} no es válida.`;
        hasErrors = true;
      }
    } else {
      if (!getPlainTextFromHtml(value).trim()) {
        initialContentErrors.value[key] = 'El contenido no puede estar vacío.';
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    creationError.value = 'Por favor, corrige los errores. Es posible que una URL de imagen en el template original sea inválida.';
    return;
  }

  isCreatingEmail.value = true;
  try {
    const response = await axios.post('/api/emails-editable', {
      template_id: selectedTemplateId.value,
      initial_content: initialContent.value
    });
    newEmailUrl.value = `${window.location.origin}/editar-correo/${response.data.uuid}`;
  } catch (error) {
    creationError.value = error.response?.data?.message || 'Error al crear correo.';
  } finally {
    isCreatingEmail.value = false;
  }
};

onMounted(fetchTemplates);
</script>