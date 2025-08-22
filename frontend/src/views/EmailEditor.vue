<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 text-center mb-4">
        <h1>Editor de Contenido de Correo</h1>
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
                <div v-for="(value, key) in editableContent" :key="key" class="mb-3" :data-editor-wrapper-key="key">
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
              <iframe
                ref="previewIframe"
                @load="handlePreviewLoad"
                :style="{ width: previewWidth, height: '2100px', border: '1px solid #ccc', 'background-color': '#f6f6f6' }"
                class="w-100 border rounded shadow-sm"
              ></iframe>
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
import { ref, onMounted, nextTick, onBeforeUnmount, reactive } from 'vue';
import axios from '../services/api.js';
import { useRoute, useRouter } from 'vue-router';
import TiptapEditor from '../components/TiptapEditor.vue';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js';
import { useFeedback } from '../composables/useFeedback.js';

const router = useRouter();
const route = useRoute();
const uuid = ref(route.params.uuid);
const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

// ... (estados del componente)
const loading = ref(true);
const error = ref(null);
const templateHtml = ref('');
const editableContent = ref({});
const validationErrors = ref({});
const isLocked = ref(false);
const templateName = ref('');
const previewIframe = ref(null);
const previewWidth = ref('772px');

let isPreviewReady = false;
let debouncePreviewTimer = null;

// PASO 2: Creamos la función que enfocará el editor
const focusEditor = (key) => {
  if (!key) return;
  // Busca el contenedor del editor usando el data-attribute que pusimos en el template
  const wrapper = document.querySelector(`[data-editor-wrapper-key="${key}"]`);
  if (wrapper) {
    // Busca el elemento editable dentro del contenedor (input, textarea o el editor de Tiptap)
    const inputElement = wrapper.querySelector('input, textarea, .ProseMirror');
    if (inputElement) {
      inputElement.focus();
      // Desplaza la vista para que el editor quede centrado
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
};

const handlePreviewLoad = () => {
  isPreviewReady = true;
  updatePreviewContent();

  // PASO 3: Añadimos el listener de doble clic al iframe
  const iframeDoc = previewIframe.value.contentWindow.document;
  if (iframeDoc) {
    iframeDoc.addEventListener('dblclick', (event) => {
      let target = event.target;
      // Busca hacia arriba en el DOM desde el elemento clickeado
      while (target && target !== iframeDoc.body) {
        // Si encuentra un elemento con nuestro 'data-editor-key'
        if (target.dataset && target.dataset.editorKey) {
          const key = target.dataset.editorKey;
          // Llama a la función de la ventana padre para enfocar el editor
          window.parent.focusEditor(key);
          break; // Detiene la búsqueda
        }
        target = target.parentElement;
      }
    });
  }
};

const updatePreviewContent = () => {
  if (!isPreviewReady || !previewIframe.value) return;
  const finalHtml = generateFinalHtml();
  previewIframe.value.contentWindow.document.body.innerHTML = `
    <div style="max-width: 772px; margin: 30px auto; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      ${finalHtml}
    </div>
  `;
};

const debouncedUpdatePreview = () => {
  clearTimeout(debouncePreviewTimer);
  debouncePreviewTimer = setTimeout(updatePreviewContent, 200);
};

const handleContentChange = () => {
  if (!hasUnsavedChanges.value) {
    autoSaveStatus.text = 'Cambios sin guardar';
    autoSaveStatus.class = 'bg-warning';
  }
  hasUnsavedChanges.value = true;
  debouncedUpdatePreview();
};

const handleTiptapUpdate = (key, newValue) => {
  editableContent.value[key] = newValue;
  handleContentChange();
};

// ... (lógica de autoguardado)
const isSaving = ref(false);
const hasUnsavedChanges = ref(false);
const autoSaveInterval = 10000;
let autoSaveTimer = null;
const autoSaveStatus = reactive({
  text: 'Listo',
  class: 'bg-secondary'
});

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
    if (err.response?.status === 404) {
      autoSaveStatus.text = 'Correo eliminado';
      autoSaveStatus.class = 'bg-danger';
      error.value = 'Este correo fue eliminado por otro usuario. Serás redirigido.';
      clearInterval(autoSaveTimer);
      document.querySelectorAll('.card button').forEach(button => button.disabled = true);
      setTimeout(() => router.push('/lista-correos'), 4000);
    } else {
      autoSaveStatus.text = 'Error al guardar';
      autoSaveStatus.class = 'bg-danger';
    }
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
    
    // PASO 4: Envolvemos el contenido con un span que lleva el data-attribute
    const styledHtmlContent = `<span data-editor-key="${key}">${rawContent.replace(/<p/g, '<p style="margin: 0;"')}</span>`;
    const generalRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    finalHtml = finalHtml.replace(generalRegex, styledHtmlContent);
  }
  return finalHtml;
}

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
  // PASO 5: Hacemos la función 'focusEditor' accesible desde el iframe
  window.focusEditor = focusEditor;

  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }
  try {
    await acquireLock();
    const emailResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`);
    const { template_id, content_json, template_name } = emailResponse.data;

    const templateResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content;
    editableContent.value = content_json;
    templateName.value = template_name;

    nextTick(() => {
      const initialHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; cursor: pointer; }
              /* Este estilo es para que el span no altere el layout del correo */
              span[data-editor-key] { display: contents; }
            </style>
          </head>
          <body>
          </body>
        </html>
      `;
      previewIframe.value.srcdoc = initialHtml;
      autoSaveTimer = setInterval(autoSaveChanges, autoSaveInterval);
    });
  } catch (err) {
    if (err.response?.status !== 409) {
      error.value = `Error al cargar. Asegúrate de que el backend está funcionando.`;
    }
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(async () => {
  // Limpiamos la función global para evitar memory leaks
  delete window.focusEditor;
  
  clearInterval(autoSaveTimer);
  clearTimeout(debouncePreviewTimer);
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