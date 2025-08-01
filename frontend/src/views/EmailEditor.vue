<template>
  <div class="email-editor-container">
    <h1>Editor de Contenido de Correo</h1>

    <template v-if="loading">
      <div class="loading">Cargando correo...</div>
    </template>
    <template v-else-if="error">
      <div class="error">{{ error }}</div>
    </template>
    <template v-else>
      <div class="editor-layout">
        <div class="controls-panel">
          <h3>Contenido Editable</h3>
          <div v-for="(value, key) in editableContent" :key="key" class="editable-field">
            <label :for="key">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
            <template v-if="key.includes('enlace_')">
              <input
                :id="key"
                v-model="editableContent[key]"
                @input="updatePreview"
                type="url"
                :class="{ 'invalid': validationErrors[key] }" />
            </template>
            <template v-else>
              <TiptapEditor
                :modelValue="editableContent[key]"
                @update:modelValue="newValue => { editableContent[key] = newValue; updatePreview(); }"
                :class="{ 'invalid': validationErrors[key] }" />
            </template>
            <p v-if="validationErrors[key]" class="validation-error">{{ validationErrors[key] }}</p>
          </div>

          <div class="button-group">
            <button @click="saveChanges" :disabled="isSaving">{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</button>
            <button @click="copyHtmlToClipboard" class="generate-html-button">Copiar HTML Final</button>
          </div>
        </div>

        <div class="preview-panel">
          <h3>Previsualización del Correo</h3>
          <!-- <div class="preview-controls">
            <button @click="setPreviewWidth('desktop')">Desktop</button>
            <button @click="setPreviewWidth('mobile')">Móvil</button>
          </div> -->
          <iframe ref="previewIframe" :style="{ width: previewWidth, height: '2100px', border: '1px solid #ccc', 'background-color': 'white' }"></iframe>
        </div>
      </div>
    </template>
    <div v-if="feedbackMessage" :class="['feedback-message', feedbackType]">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import TiptapEditor from '../components/TiptapEditor.vue'; // Importa el nuevo componente


const validationErrors = ref({}); // Objeto para almacenar errores de validación por campo
const route = useRoute();
const uuid = ref(route.params.uuid);

const templateHtml = ref('');
const editableContent = ref({});
const loading = ref(true);
const error = ref(null);
const previewIframe = ref(null);
const isSaving = ref(false);
const previewWidth = ref('772px'); // Ancho estándar de tu template por defecto

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).replace(/_/g, ' ');
};

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

    // Si el campo es un enlace, solo codificamos la URL.
    // Si es un campo editable por TipTap, el contenido ya es HTML, así que no convertimos \n a <br>
    if (key.includes('enlace_')) {
      replacement = encodeURI(replacement);
    }
    // Nota: Si el contenido ya viene como HTML de TipTap, no necesitamos .replace(/\n/g, '<br>')
    // porque TipTap ya maneja los saltos de línea y el formato HTML.
    // Asegúrate de que tu initial_content en HomeView.vue también sea HTML si lo necesitas.

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
  console.log('EmailEditor mounted. UUID:', uuid.value);

  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }

  try {
    console.log('Fetching email editable data for UUID:', uuid.value);
    const emailResponse = await axios.get(`http://localhost:3000/api/emails-editable/${uuid.value}`);
    const { template_id, content_json } = emailResponse.data;
    console.log('Email editable data received:', emailResponse.data);

    console.log('Fetching template HTML for ID:', template_id);
    const templateResponse = await axios.get(`http://localhost:3000/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content;
    console.log('Template HTML received (first 200 chars):', templateHtml.value.substring(0, 200) + '...');

    editableContent.value = content_json;
    updatePreview(); 

  } catch (err) {
    console.error('Error al cargar datos del correo o template:', err);
    if (err.response && err.response.status === 404) {
        error.value = 'Correo o template no encontrado. Verifica la URL.';
    } else {
        error.value = `Error al cargar. Asegúrate de que el backend está funcionando: ${err.message}`;
    }
  } finally {
    loading.value = false;
  }
});

// const saveChanges = async () => {
//   isSaving.value = true;
//   try {
//     await axios.put(`http://localhost:3000/api/emails-editable/${uuid.value}`, {
//       updated_content: editableContent.value
//     });
//     // Ahora, en lugar de alert, usamos feedback visual
//     showFeedback('Cambios guardados exitosamente!', 'success');
//   } catch (err) {
//     console.error('Error al guardar cambios:', err);
//     showFeedback('Error al guardar cambios. Revisa la consola.', 'error');
//   } finally {
//     isSaving.value = false;
//   }
// };

const saveChanges = async () => {
  // 1. Resetear errores de validación previos
  validationErrors.value = {};

  // 2. Realizar validación en el frontend
  let hasValidationErrors = false;
  for (const key in editableContent.value) {
    const value = editableContent.value[key];

    if (key.includes('enlace_')) {
      // Validación para URLs: no vacío y formato de URL
      if (!value) {
        validationErrors.value[key] = 'Este campo de URL no puede estar vacío.';
        hasValidationErrors = true;
      } else if (!isValidUrl(value)) { // Usaremos una función auxiliar isValidUrl
        validationErrors.value[key] = 'Por favor, introduce una URL válida.';
        hasValidationErrors = true;
      }
    } else {
      // Validación para campos de texto WYSIWYG: que no estén vacíos de contenido real
      const plainText = getPlainTextFromHtml(value); // Usaremos una función auxiliar
      if (!plainText.trim()) { // Si el texto plano está vacío o solo con espacios
        validationErrors.value[key] = 'El contenido no puede estar vacío.';
        hasValidationErrors = true;
      }
    }
  }

  if (hasValidationErrors) {
    showFeedback('Por favor, corrige los errores de validación.', 'error');
    return; // Detener el guardado si hay errores
  }

  isSaving.value = true;
  try {
    await axios.put(`http://localhost:3000/api/emails-editable/${uuid.value}`, {
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

// Funciones auxiliares para validación:
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// Función para extraer texto plano de HTML (para TipTap)
// Esto es una simplificación; para un parseo HTML robusto se usaría una librería DOM
const getPlainTextFromHtml = (html) => {
  if (!html) return '';
  // Elimina etiquetas HTML y espacios extra
  return html.replace(/<[^>]*>/g, '').trim();
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

const setPreviewWidth = (type) => {
  if (type === 'desktop') {
    previewWidth.value = '772px';
  } else if (type === 'mobile') {
    previewWidth.value = '320px';
  }
  updatePreview();
};

// --- Feedback Visual ---
const feedbackMessage = ref('');
const feedbackType = ref(''); // 'success' o 'error'
let feedbackTimeout = null;

const showFeedback = (message, type) => {
    feedbackMessage.value = message;
    feedbackType.value = type;

    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
    }
    feedbackTimeout = setTimeout(() => {
        feedbackMessage.value = '';
        feedbackType.value = '';
    }, 3000); // El mensaje desaparecerá después de 3 segundos
};
</script>

<style scoped>
.email-editor-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  font-family: Arial, sans-serif;
  min-height: 100vh;
  background-color: #f0f2f5;
  position: relative; /* Para posicionar el feedback */
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.editor-layout {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  max-width: 1400px;
  gap: 20px;
  margin-top: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.controls-panel {
  flex: 1;
  min-width: 300px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
}

.controls-panel h3 {
  margin-top: 0;
  color: #555;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.editable-field {
  margin-bottom: 15px;
}

.editable-field label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
  font-size: 0.9em;
}

.editable-field input[type="url"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 0.95em;
  height: 38px;
  background-color: #fff;
}

.button-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
}

button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.generate-html-button {
    background-color: #28a745;
}
.generate-html-button:hover {
    background-color: #218838;
}

.preview-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #fff;
  padding: 20px;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
  min-width: 400px;
}

.preview-panel h3 {
  margin-top: 0;
  color: #555;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.preview-controls {
    margin-bottom: 15px;
}
.preview-controls button {
    background-color: #6c757d;
    margin: 0 5px;
    padding: 8px 15px;
    font-size: 14px;
}
.preview-controls button:hover {
    background-color: #5a6268;
}

iframe {
  width: 100%;
  height: 2100px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  transition: width 0.3s ease-in-out;
  max-width: 100%;
}

.loading, .error {
  margin-top: 20px;
  font-size: 1.2em;
  color: #555;
  text-align: center;
}
.error {
  color: #dc3545;
  font-weight: bold;
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
.editable-field input.invalid,
.editable-field textarea.invalid,
.editable-field .tiptap-editor-wrapper.invalid { /* Estilo para el borde si es inválido */
    border-color: #dc3545;
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


@media (max-width: 768px) {
    .editor-layout {
        flex-direction: column;
    }
    .controls-panel, .preview-panel {
        min-width: unset;
        width: 100%;
    }
}
</style>