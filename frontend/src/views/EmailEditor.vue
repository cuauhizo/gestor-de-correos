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
                <div v-for="(value, key) in visibleEditableContent" :key="key" class="mb-3" :data-editor-wrapper-key="key">
                  <label :for="key" class="form-label fw-bold">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
                  
                  <template v-if="key.includes('enlace_')">
                    <input
                      :id="key"
                      :value="editableContent[key]"
                      @input="editableContent[key] = $event.target.value; handleContentChange();"
                      type="url"
                      class="form-control"
                      :class="{ 'is-invalid': validationErrors[key] }"
                    />
                  </template>
                  
                  <template v-else>
                    <TiptapEditor
                      :modelValue="value"
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
import { ref, onMounted, nextTick, onBeforeUnmount, reactive, computed } from 'vue';
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
const templateName = ref('');
const previewIframe = ref(null);
const previewWidth = ref('772px');
let isPreviewReady = false;
let debouncePreviewTimer = null;

// --- Lógica de Autoguardado (Mejorada) ---
const isSaving = ref(false);
const hasUnsavedChanges = ref(false);
const autoSaveInterval = 10000;
let autoSaveTimeoutId = null; // Usaremos esto para controlar el timeout
const autoSaveStatus = reactive({
  text: 'Listo',
  class: 'bg-secondary'
});

// CAMBIO: Esta función programa el siguiente autoguardado
const scheduleNextAutoSave = () => {
  clearTimeout(autoSaveTimeoutId); // Limpia cualquier timer anterior
  autoSaveTimeoutId = setTimeout(autoSaveChanges, autoSaveInterval);
};

const autoSaveChanges = async () => {
  // Si no hay cambios o ya se está guardando, simplemente reprograma e ignora
  if (!hasUnsavedChanges.value || isSaving.value) {
    scheduleNextAutoSave();
    return;
  }

  const isValid = validateContent(true);
  if (!isValid) {
    autoSaveStatus.text = 'Error de validación';
    autoSaveStatus.class = 'bg-danger';
    scheduleNextAutoSave(); // Reprograma para volver a intentar más tarde
    return;
  }

  isSaving.value = true;
  autoSaveStatus.text = 'Guardando...';
  autoSaveStatus.class = 'bg-info';

  try {
    await axios.put(`/api/emails-editable/${uuid.value}`, {
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
      error.value = 'Este correo fue eliminado. No se pueden guardar más cambios.';
      clearTimeout(autoSaveTimeoutId); // Detenemos el autoguardado permanentemente
      return; // No reprogramar
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
    // CAMBIO: Reprograma el siguiente guardado, sin importar si tuvo éxito o fue un error temporal
    scheduleNextAutoSave();
  }
};


const visibleEditableContent = computed(() => {
  const filteredContent = {};
  for (const key in editableContent.value) {
    if (!key.startsWith('image_')) {
      filteredContent[key] = editableContent.value[key];
    }
  }
  return filteredContent;
});
const updateEditableContent = (key, newValue) => {
  if (editableContent.value[key] !== newValue) {
    editableContent.value[key] = newValue;
    handleContentChange();
  }
};
const focusEditor = (key) => {
  if (!key) return;
  const wrapper = document.querySelector(`[data-editor-wrapper-key="${key}"]`);
  if (wrapper) {
    const inputElement = wrapper.querySelector('input, textarea, .ProseMirror');
    if (inputElement) {
      inputElement.focus();
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
};
const handlePreviewLoad = () => {
  isPreviewReady = true;
  updatePreviewContent();
  const iframeDoc = previewIframe.value.contentWindow.document;
  if (iframeDoc) {
    iframeDoc.addEventListener('dblclick', (event) => {
      let target = event.target;
      while (target && target !== iframeDoc.body) {
        if (target.dataset && target.dataset.editorKey) {
          window.parent.focusEditor(target.dataset.editorKey);
          break;
        }
        target = target.parentElement;
      }
    });
    iframeDoc.addEventListener('click', (event) => {
      const target = event.target;
      if (target.tagName === 'IMG' && target.dataset.editorKey) {
        event.preventDefault();
        const key = target.dataset.editorKey;
        const currentUrl = editableContent.value[key] || '';
        const newUrl = prompt("Introduce la nueva URL de la imagen:", currentUrl);
        if (newUrl !== null && newUrl !== currentUrl) {
          window.parent.updateEditableContent(key, newUrl);
        }
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
const generateFinalHtml = (forClipboard = false) => {
  let finalHtml = templateHtml.value;
  let imgIndex = 0;
  finalHtml = finalHtml.replace(/<img[^>]*>/g, (match) => {
    const key = `image_${imgIndex}`;
    const newSrc = editableContent.value[key] ? `src="${encodeURI(editableContent.value[key])}"` : 'src=""';
    let newTag = match.replace(/src="[^"]*"/, newSrc);
    if (!forClipboard) {
      newTag = newTag.replace('<img', `<img data-editor-key="${key}"`);
    }
    imgIndex++;
    return newTag;
  });
  for (const key in editableContent.value) {
    if (!key.startsWith('image_')) {
      const rawContent = editableContent.value[key] || '';
      const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      if (key.includes('enlace_')) {
        finalHtml = finalHtml.replace(placeholderRegex, encodeURI(rawContent));
      } else {
        const plainText = getPlainTextFromHtml(rawContent);
        const styledHtml = rawContent.replace(/<p/g, '<p style="margin: 0;"');
        finalHtml = finalHtml.replace(new RegExp(`(alt="[^"]*){{\\s*${key}\\s*}}([^"]*")`, 'g'), `$1${plainText}$2`);
        const replacement = forClipboard ? styledHtml : `<span data-editor-key="${key}">${styledHtml}</span>`;
        finalHtml = finalHtml.replace(placeholderRegex, replacement);
      }
    }
  }
  return finalHtml;
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
const manualSaveChanges = async () => {
    clearTimeout(autoSaveTimeoutId); // Detenemos el timer para forzar el guardado manual
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
    if (key.startsWith('image_') || key.includes('enlace_')) {
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
const copyHtmlToClipboard = () => {
  const textToCopy = generateFinalHtml(true);
  navigator.clipboard.writeText(textToCopy)
    .then(() => showFeedback('HTML copiado al portapapeles!', 'success'))
    .catch(err => showFeedback('Error al copiar HTML.', 'error'));
};
const acquireLock = async () => {
    try {
        await axios.post(`/api/emails-editable/${uuid.value}/lock`);
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
        await axios.post(`/api/emails-editable/${uuid.value}/unlock`);
        isLocked.value = false;
    } catch (err) {
        console.error('Error al liberar el bloqueo:', err);
    }
};
onMounted(async () => {
  window.focusEditor = focusEditor;
  window.updateEditableContent = updateEditableContent;
  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }
  try {
    await acquireLock();
    const emailResponse = await axios.get(`/api/emails-editable/${uuid.value}`);
    const { template_id, content_json, template_name } = emailResponse.data;
    const templateResponse = await axios.get(`/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content;
    editableContent.value = content_json;
    templateName.value = template_name;
    nextTick(() => {
      const initialHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
              span[data-editor-key] { cursor: pointer; display: contents; }
              img[data-editor-key] { cursor: pointer; border: 2px dashed transparent; transition: border-color 0.2s; }
              img[data-editor-key]:hover { border-color: #0d6efd; }
            </style>
          </head>
          <body></body>
        </html>
      `;
      previewIframe.value.srcdoc = initialHtml;
      // CAMBIO: Iniciamos el ciclo de autoguardado por primera vez
      scheduleNextAutoSave();
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
  delete window.focusEditor;
  delete window.updateEditableContent;
  // CAMBIO: Limpiamos el timeout en lugar del interval
  clearTimeout(autoSaveTimeoutId);
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