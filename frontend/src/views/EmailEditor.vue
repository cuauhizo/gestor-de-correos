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
import { ref, onMounted, nextTick, onBeforeUnmount  } from 'vue';
import axios from '../services/api.js';
import { useRoute, useRouter } from 'vue-router';
import TiptapEditor from '../components/TiptapEditor.vue';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js';
import { useFeedback } from '../composables/useFeedback.js';
import { useAuthStore } from '../stores/auth.js';


const router = useRouter();
const authStore = useAuthStore();
const isLocked = ref(false);
const lockedByUsername = ref(null);

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

const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

const updatePreview = () => {
  // ... (Esta función se queda exactamente igual, no es necesario cambiarla)
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
        p { margin: 0; }
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


// ⏬ ¡AQUÍ ESTÁ EL CAMBIO PRINCIPAL! ⏬
onMounted(async () => {
  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }

  try {
    // 1. PRIMERO, intentamos bloquear el correo. La función mostrará el mensaje que quieres.
    await acquireLock();

    // 2. SI EL BLOQUEO FUE EXITOSO, cargamos el resto de los datos.
    const emailResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`);
    const { template_id, content_json } = emailResponse.data;

    const templateResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content;
    editableContent.value = content_json;

    nextTick(() => {
      updatePreview();
    });

  } catch (err) {
    // Si el error es 409 (conflicto), ya fue manejado por acquireLock, así que no lo mostramos de nuevo.
    if (err.response?.status !== 409) {
      console.error('Error al cargar datos del correo o template:', err);
      error.value = `Error al cargar. Asegúrate de que el backend está funcionando: ${err.message}`;
    }
  } finally {
    loading.value = false;
    nextTick(() => {
      updatePreview();
    });
  }
});

onBeforeUnmount(async () => {
    if (isLocked.value) {
        await releaseLock();
    }
});

const saveChanges = async () => {
  if (!isLocked.value) {
        showFeedback('No tienes permiso para guardar. El correo no está bloqueado por ti.', 'error');
        return;
    }

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

// Adquirir el bloqueo
const acquireLock = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}/lock`);
        isLocked.value = true;
        // ¡ESTA LÍNEA ES LA QUE MUESTRA EL MENSAJE QUE QUIERES VER!
        showFeedback('Correo bloqueado para edición.', 'success');
    } catch (err) {
        if (err.response?.status === 409) { // 409 Conflict
            isLocked.value = false;
            lockedByUsername.value = err.response.data.message.split('por ')[1].split('.')[0];
            showFeedback(`Este correo está siendo editado por ${lockedByUsername.value}.`, 'error');
            // Redirigimos al usuario si no puede editar
            router.push('/lista-correos');
        } else {
            error.value = 'Error al adquirir el bloqueo. No se puede editar.';
            showFeedback('Error al adquirir el bloqueo.', 'error');
        }
        // Lanzamos el error para que el `onMounted` detenga su ejecución
        throw err;
    }
};

// Liberar el bloqueo
const releaseLock = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}/unlock`);
        isLocked.value = false;
        // No es necesario notificar al usuario, es una acción en segundo plano
        console.log('Correo desbloqueado.');
    } catch (err) {
        console.error('Error al liberar el bloqueo:', err);
    }
};

</script>

<style scoped>

.scroll{
  max-height: 2100px; /* Ajusta según sea necesario */
  overflow-y: auto;
  padding-right: 10px; /* Espacio para la barra de desplazamiento */
}
</style>