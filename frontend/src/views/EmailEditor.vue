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
              <h3 class="card-title text-center mb-3">Contenido Editable</h3>
              <div class="scroll">
                <div v-for="(value, key) in editableContent" :key="key" class="mb-3">
                  <label :for="key" class="form-label fw-bold">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
                  <template v-if="key.includes('enlace_')">
                    <input
                      :id="key"
                      v-model="editableContent[key]"
                      @input="updatePreview"
                      type="url"
                      class="form-control"
                      :class="{ 'is-invalid': validationErrors[key] }"
                    />
                  </template>
                  <template v-else>
                    <TiptapEditor
                      :modelValue="editableContent[key]"
                      @update:modelValue="newValue => { editableContent[key] = newValue; updatePreview(); }"
                      :class="{ 'is-invalid': validationErrors[key] }"
                    />
                  </template>
                  <div v-if="validationErrors[key]" class="invalid-feedback d-block">{{ validationErrors[key] }}</div>
                </div>
              </div>
              <div class="d-flex flex-wrap justify-content-center gap-2 mt-3">
                <router-link to="/lista-correos" class="btn btn-danger">Cancelar</router-link>
                <button @click="saveChanges" :disabled="isSaving" class="btn btn-primary">
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
              <h3 class="card-title text-center mb-3">Previsualización del Correo</h3>
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
import { ref, onMounted, nextTick } from 'vue'; // <-- Importa nextTick aquí
import axios from 'axios';
import { useRoute } from 'vue-router';
import TiptapEditor from '../components/TiptapEditor.vue';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js'; // <-- Asegúrate de estas importaciones
import { useFeedback } from '../composables/useFeedback.js'; // <-- Asegúrate de esta importación

const validationErrors = ref({});
const route = useRoute();
const uuid = ref(route.params.uuid);

const templateHtml = ref('');
const editableContent = ref({});
const loading = ref(true);
const error = ref(null);
const previewIframe = ref(null);
const isSaving = ref(false);
const previewWidth = ref('772px');

const { feedbackMessage, feedbackType, showFeedback } = useFeedback(); // <-- Usa el composable de feedback aquí

const updatePreview = () => {
  if (!previewIframe.value) {
    console.warn('previewIframe ref es null. No se puede actualizar la previsualización.');
    return;
  }
  if (!templateHtml.value) {
    console.warn('templateHtml.value es nulo. No hay template para previsualizar.');
    return;
  }

  let finalHtml = templateHtml.value;

  for (const key in editableContent.value) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    let replacement = editableContent.value[key] || '';

    if (key.includes('enlace_')) {
      replacement = encodeURI(replacement);
    }

    finalHtml = finalHtml.replace(placeholder, replacement);
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Previsualización</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f6f6f6; }
        h1, h2, h3, h4, h5, h6 { margin-top: 0; margin-bottom: 8px; }
        p { margin-top: 0; margin-bottom: 1em; }
        a { color: #007bff; text-decoration: underline; }
        .email-wrapper {
          max-width: 772px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        @media (max-width: 600px) {
          .email-wrapper {
            width: 100% !important;
          }
        }
      </style>
    </head>
    <body>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <div class="email-wrapper">
              ${finalHtml}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  previewIframe.value.contentWindow.document.open();
  previewIframe.value.contentWindow.document.write(fullHtml);
  previewIframe.value.contentWindow.document.close();
};

onMounted(async () => {
  // console.log('EmailEditor mounted. UUID:', uuid.value);

  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }

  try {
    // console.log('Fetching email editable data for UUID:', uuid.value);
    const emailResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`);
    const { template_id, content_json } = emailResponse.data;
    // console.log('Email editable data received:', emailResponse.data);

    // console.log('Fetching template HTML for ID:', template_id);
    const templateResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content;
    // console.log('Template HTML received (first 200 chars):', templateHtml.value.substring(0, 200) + '...');

    editableContent.value = content_json;
    
    // Aquí, la variable `loading` aún es `true`.
    // La vista con el iframe no se ha renderizado.
  } catch (err) {
    console.error('Error al cargar datos del correo o template:', err);
    if (err.response && err.response.status === 404) {
        error.value = 'Correo o template no encontrado. Verifica la URL.';
    } else {
        error.value = `Error al cargar. Asegúrate de que el backend está funcionando: ${err.message}`;
    }
  } finally {
    // Aquí es donde `loading.value` se establece en `false`
    // y la vista comienza a renderizarse.
    loading.value = false;
    
    // Usa nextTick para esperar a que el DOM se actualice antes de llamar a updatePreview
    nextTick(() => {
      updatePreview();
    });
  }
});

const saveChanges = async () => {
  validationErrors.value = {};
  let hasValidationErrors = false;
  for (const key in editableContent.value) {
    const value = editableContent.value[key];

    if (key.includes('enlace_')) {
      if (!value) {
        validationErrors.value[key] = 'Este campo de URL no puede estar vacío.';
        hasValidationErrors = true;
      } else if (!isValidUrl(value)) {
        validationErrors.value[key] = 'Por favor, introduce una URL válida.';
        hasValidationErrors = true;
      }
    } else {
      const plainText = getPlainTextFromHtml(value);
      if (!plainText.trim()) {
        validationErrors.value[key] = 'El contenido no puede estar vacío.';
        hasValidationErrors = true;
      }
    }
  }

  if (hasValidationErrors) {
    showFeedback('Por favor, corrige los errores de validación.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    await axios.put(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`, {
      updated_content: editableContent.value
    });
    showFeedback('Cambios guardados exitosamente!', 'success');
  } catch (err) {
    console.error('Error al guardar cambios:', err);
    showFeedback('Error al guardar cambios. Revisa la consola.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const copyHtmlToClipboard = () => {
  let finalHtml = templateHtml.value;
  for (const key in editableContent.value) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    let replacement = editableContent.value[key] || '';
    if (key.includes('enlace_')) {
      replacement = encodeURI(replacement);
    }
    finalHtml = finalHtml.replace(placeholder, replacement);
  }

  const textToCopy = finalHtml; 

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      showFeedback('HTML copiado al portapapeles!', 'success');
    })
    .catch(err => {
      console.error('Error al copiar HTML:', err);
      showFeedback('Error al copiar HTML. Tu navegador podría requerir HTTPS o permisos específicos para copiar.', 'error');
    });
};

</script>

<style scoped>

.scroll{
  max-height: 2100px; /* Ajusta según sea necesario */
  overflow-y: auto;
  padding-right: 10px; /* Espacio para la barra de desplazamiento */
}

/* Estilos para el feedback visual */
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

.validation-error {
  color: #dc3545; /* Rojo */
  font-size: 0.85em;
  margin-top: 5px;
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