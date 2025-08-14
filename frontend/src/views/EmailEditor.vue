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
import { ref, onMounted, nextTick, onBeforeUnmount  } from 'vue'; // <-- Importa nextTick aquí
import axios from '../services/api.js';
import { useRoute, useRouter } from 'vue-router';
import TiptapEditor from '../components/TiptapEditor.vue';
import { capitalizeFirstLetter, isValidUrl, getPlainTextFromHtml } from '../utils/helpers.js'; // <-- Asegúrate de estas importaciones
import { useFeedback } from '../composables/useFeedback.js'; // <-- Asegúrate de esta importación
import { useAuthStore } from '../stores/auth.js';


const router = useRouter(); // Instancia el router
const authStore = useAuthStore(); // Instancia el store de autenticación
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

// onMounted(async () => {
//   console.log('EmailEditor mounted. UUID:', uuid.value);

//   if (!uuid.value) {
//     error.value = 'UUID de correo no proporcionado.';
//     loading.value = false;
//     return;
//   }

//   try {
//     console.log('Fetching email editable data for UUID:', uuid.value);
//     const emailResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`);
//     const { template_id, content_json, is_locked, locked_by_user_id } = emailResponse.data;
    
//     // Asignar el estado de bloqueo
//     isLocked.value = is_locked;
//     if (is_locked && locked_by_user_id) {
//         // En un caso real, obtendrías el nombre del usuario del backend.
//         // Para este ejemplo, solo verificamos si el bloqueo no es del usuario actual.
//         if (locked_by_user_id !== authStore.user.id) {
//             lockedByUsername.value = 'otro usuario';
//         }
//     }

//     console.log('Fetching template HTML for ID:', template_id);
//     const templateResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${template_id}`);
//     templateHtml.value = templateResponse.data.html_content;

//     editableContent.value = content_json;
    
//     nextTick(() => {
//       updatePreview();
//     });

//   } catch (err) {
//     console.error('Error al cargar datos del correo o template:', err);
//     if (err.response && err.response.status === 404) {
//         error.value = 'Correo o template no encontrado. Verifica la URL.';
//     } else {
//         error.value = `Error al cargar. Asegúrate de que el backend está funcionando: ${err.message}`;
//     }
//   } finally {
//     loading.value = false;
//     nextTick(() => {
//       updatePreview();
//     });
//   }
// });

onMounted(async () => {
  console.log('EmailEditor mounted. UUID:', uuid.value);

  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }

  try {
        const emailResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}`);
        const { template_id, content_json, is_locked, locked_by_user_id } = emailResponse.data;
        
        // Verifica si el correo está bloqueado y si el usuario actual es el que tiene el bloqueo
        if (is_locked && locked_by_user_id === authStore.user.id) {
            isLocked.value = true;
        } else if (is_locked && locked_by_user_id !== authStore.user.id) {
            isLocked.value = false;
            // Tendrías que hacer una llamada extra para obtener el nombre de usuario
            // del que tiene el bloqueo, o hacer que el backend lo devuelva.
            // Por ahora, 'otro usuario' es suficiente.
            lockedByUsername.value = 'otro usuario';
        } else {
            // Si el correo no está bloqueado, lo bloqueamos ahora
            await acquireLock();
        }

        const templateResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/${template_id}`);
        templateHtml.value = templateResponse.data.html_content;
        editableContent.value = content_json;

        nextTick(() => {
            updatePreview();
        });

  } catch (err) {
    console.error('Error al cargar datos del correo o template:', err);
    if (err.response && err.response.status === 404) {
        error.value = 'Correo o template no encontrado. Verifica la URL.';
    } else {
        error.value = `Error al cargar. Asegúrate de que el backend está funcionando: ${err.message}`;
    }
  } finally {
    loading.value = false;
    nextTick(() => {
      updatePreview();
    });
  }
});

// Liberar el bloqueo cuando el usuario se va del editor

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

// NUEVA FUNCIÓN: Adquirir el bloqueo
const acquireLock = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}/lock`);
        isLocked.value = true;
        showFeedback('Correo bloqueado para edición.', 'success');
    } catch (err) {
        if (err.response?.status === 409) { // 409 Conflict
            isLocked.value = false;
            lockedByUsername.value = err.response.data.message.split('por ')[1].split('.')[0];
            showFeedback(`Este correo está siendo editado por ${lockedByUsername.value}.`, 'error');
        } else {
            error.value = 'Error al adquirir el bloqueo. No se puede editar.';
            showFeedback('Error al adquirir el bloqueo.', 'error');
        }
    }
};

// NUEVA FUNCIÓN: Liberar el bloqueo
const releaseLock = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuid.value}/unlock`);
        isLocked.value = false;
        showFeedback('Correo desbloqueado.', 'success');
    } catch (err) {
        // Si el desbloqueo falla, el servidor lo gestionará, pero es bueno manejarlo
        console.error('Error al liberar el bloqueo:', err);
    }
};

</script>

<style scoped>

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
.editable-field input.invalid,
.editable-field textarea.invalid,
.editable-field .tiptap-editor-wrapper.invalid { /* Estilo para el borde si es inválido */
    border-color: #dc3545;
}

.scroll{
  max-height: 2100px; /* Ajusta según sea necesario */
  overflow-y: auto;
  padding-right: 10px; /* Espacio para la barra de desplazamiento */
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