<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 text-center mb-4">
        <h1>Editor de Contenido de Correo</h1>
        <!-- <h2 v-if="templateName" class="h4 text-muted fw-normal">
          Editando Template: <span class="fw-bold">{{ templateName }}</span>
        </h2> -->
      </div>
      <div class="col-12">
        <div v-if="loading" class="text-center text-secondary">Cargando correo...</div>
        <div v-if="error" class="alert alert-danger text-center">{{ error }}</div>

        <div v-if="!loading && !error" class="row g-4">
          <div class="col-md-4">
            <div class="card p-3 h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="card-title text-center mb-0">Contenido Editable</h3>
                <span :class="['badge', autoSaveStatus.class]">{{ autoSaveStatus.text }}</span>
              </div>
              <div class="scroll">
                <div v-for="(value, key) in editableContent" :key="key" class="mb-3">
                  <label :for="key" class="form-label fw-bold">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
                  <template v-if="key.includes('enlace_')">
                    <input
                      :id="key"
                      v-model="editableContent[key]"
                      @input="handleContentChange"
                      type="url"
                      class="form-control"
                      :class="{ 'is-invalid': validationErrors[key] }"
                    />
                  </template>
                  <template v-else>
                    <TiptapEditor
                      :modelValue="editableContent[key]"
                      @update:modelValue="newValue => handleTiptapUpdate(key, newValue)"
                      :class="{ 'is-invalid': validationErrors[key] }"
                    />
                  </template>
                  <div v-if="validationErrors[key]" class="invalid-feedback d-block">{{ validationErrors[key] }}</div>
                </div>
              </div>
              <div class="d-flex flex-wrap justify-content-center gap-2 mt-3">
                <router-link to="/lista-correos" class="btn btn-danger">Cancelar</router-link>
                <button @click="manualSaveChanges" :disabled="isSaving" class="btn btn-primary">
                  {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
                <button @click="copyHtmlToClipboard" class="btn btn-success">
                  Copiar HTML Final
                </button>
              </div>
            </div>
          </div>

          <div class="col-md-8">
            <div class="card p-3 h-100">
              <h3 v-if="templateName" class="card-title text-center mb-3">Previsualización del Correo - <span class="fw-bold">{{ templateName }}</span></h3>
              <iframe ref="previewIframe" :style="{ width: previewWidth, height: '2100px' }" class="w-100 border rounded shadow-sm"></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="feedbackMessage" :class="['feedback-message', feedbackType]">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount, reactive, watch } from 'vue';
import axios from '../services/api.js';
import { useRoute, useRouter } from 'vue-router';
import TiptapEditor from '../components/TiptapEditor.vue';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js';
import { useFeedback } from '../composables/useFeedback.js';

const router = useRouter();
const route = useRoute();
const uuid = ref(route.params.uuid);
const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

// --- Estados del componente ---
const loading = ref(true);
const error = ref(null);
const templateHtml = ref('');
const editableContent = ref({});
const validationErrors = ref({});
const isLocked = ref(false);
// --- NUEVO REF PARA EL NOMBRE DEL TEMPLATE ---
const templateName = ref('');

// --- Lógica de Autoguardado ---
const isSaving = ref(false);
const hasUnsavedChanges = ref(false);
const autoSaveInterval = 10000; // Guardar cada 10 segundos
let autoSaveTimer = null;

const autoSaveStatus = reactive({
  text: 'Listo',
  class: 'bg-secondary'
});

const handleContentChange = () => {
  if (!hasUnsavedChanges.value) {
    autoSaveStatus.text = 'Cambios sin guardar';
    autoSaveStatus.class = 'bg-warning';
  }
  hasUnsavedChanges.value = true;
  updatePreview();
};

const handleTiptapUpdate = (key, newValue) => {
  editableContent.value[key] = newValue;
  handleContentChange();
};

const autoSaveChanges = async () => {
  if (!hasUnsavedChanges.value || isSaving.value) return;

  const isValid = validateContent(true);
  if (!isValid) {
    autoSaveStatus.text = 'Error de validación';
    autoSaveStatus.class = 'bg-danger';
    return;
  }

  isSaving.value = true;
  autoSaveStatus.text = 'Guardando...';
  autoSaveStatus.class = 'bg-info';

  try {
    await axios.put(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`, {
      updated_content: editableContent.value
    });
    
    autoSaveStatus.text = 'Cambios guardados';
    autoSaveStatus.class = 'bg-success';
    hasUnsavedChanges.value = false;

    window.dispatchEvent(new Event('mousemove'));
    
  } catch (err) {
    console.error('Error en autoguardado:', err);
    autoSaveStatus.text = 'Error al guardar';
    autoSaveStatus.class = 'bg-danger';
  } finally {
    isSaving.value = false;
    setTimeout(() => {
        if (!hasUnsavedChanges.value) {
            autoSaveStatus.text = 'Listo';
            autoSaveStatus.class = 'bg-secondary';
        }
    }, 2000);
  }
};

const manualSaveChanges = async () => {
    const isValid = validateContent();
    if (!isValid) {
        showFeedback('Por favor, corrige los errores de validación.', 'error');
        return;
    }
    await autoSaveChanges();
    if (autoSaveStatus.class === 'bg-success') {
        showFeedback('Cambios guardados exitosamente!', 'success');
    }
};

const validateContent = (silent = false) => {
  validationErrors.value = {};
  let hasErrors = false;
  for (const key in editableContent.value) {
    const value = editableContent.value[key];
    if (key.includes('enlace_')) {
      if (!value || !isValidUrl(value)) {
        if (!silent) validationErrors.value[key] = 'Introduce una URL válida.';
        hasErrors = true;
      }
    } else {
      if (!getPlainTextFromHtml(value).trim()) {
        if (!silent) validationErrors.value[key] = 'El contenido no puede estar vacío.';
        hasErrors = true;
      }
    }
  }
  return !hasErrors;
};

const generateFinalHtml = () => {
  if (!templateHtml.value) return '';
  let finalHtml = templateHtml.value;
  for (const key in editableContent.value) {
    let rawContent = editableContent.value[key] || '';
    if (key.includes('enlace_')) {
      rawContent = encodeURI(rawContent);
    }
    const plainTextContent = getPlainTextFromHtml(rawContent);
    const altRegex = new RegExp(`(alt="[^"]*){{\\s*${key}\\s*}}([^"]*")`, 'g');
    finalHtml = finalHtml.replace(altRegex, `$1${plainTextContent}$2`);
    const styledHtmlContent = rawContent.replace(/<p/g, '<p style="margin: 0;"');
    const generalRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    finalHtml = finalHtml.replace(generalRegex, styledHtmlContent);
  }
  return finalHtml;
}

const previewIframe = ref(null);
const previewWidth = ref('772px');

const updatePreview = () => {
  if (!previewIframe.value) return;
  const finalHtml = generateFinalHtml();
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Previsualización</title></head>
    <body><div style="max-width: 772px; margin: auto;">${finalHtml}</div></body>
    </html>`;
  previewIframe.value.srcdoc = fullHtml;
};

const copyHtmlToClipboard = () => {
  const textToCopy = generateFinalHtml();
  navigator.clipboard.writeText(textToCopy)
    .then(() => showFeedback('HTML copiado al portapapeles!', 'success'))
    .catch(err => showFeedback('Error al copiar HTML.', 'error'));
};

const acquireLock = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}/lock`);
        isLocked.value = true;
    } catch (err) {
        if (err.response?.status === 409) {
            const lockedByUsername = err.response.data.message.split('por ')[1].split('.')[0];
            showFeedback(`Este correo está siendo editado por ${lockedByUsername}.`, 'error');
            router.push('/lista-correos');
        } else {
            error.value = 'Error al adquirir el bloqueo. No se puede editar.';
        }
        throw err;
    }
};

const releaseLock = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}/unlock`);
        isLocked.value = false;
    } catch (err) {
        console.error('Error al liberar el bloqueo:', err);
    }
};

onMounted(async () => {
  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }

  try {
    await acquireLock();
    const emailResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`);
    // --- LÍNEA MODIFICADA PARA OBTENER EL template_name ---
    const { template_id, content_json, template_name } = emailResponse.data;

    const templateResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content;
    editableContent.value = content_json;
    templateName.value = template_name; // Guardamos el nombre del template

    nextTick(() => {
      updatePreview();
      autoSaveTimer = setInterval(autoSaveChanges, autoSaveInterval);
    });

  } catch (err) {
    if (err.response?.status !== 409) {
      error.value = `Error al cargar. Asegúrate de que el backend está funcionando.`;
    }
  } finally {
    loading.value = false;
    nextTick(() => {
      updatePreview();
    });
  }
});

onBeforeUnmount(async () => {
  clearInterval(autoSaveTimer);
  if (hasUnsavedChanges.value) {
    await autoSaveChanges();
  }
  if (isLocked.value) {
    await releaseLock();
  }
});
</script>

<style scoped>
.scroll {
  max-height: 2100px;
  overflow-y: auto;
  padding-right: 10px;
}
</style>