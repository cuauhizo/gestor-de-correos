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
              <input :id="key" v-model="editableContent[key]" @input="updatePreview" type="url" />
            </template>
            <template v-else>
              <textarea :id="key" v-model="editableContent[key]" @input="updatePreview"></textarea>
            </template>
          </div>
          
          <div class="button-group">
              <button @click="saveChanges" :disabled="isSaving">{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</button>
              <button @click="copyHtmlToClipboard" class="generate-html-button">Copiar HTML Final</button>
          </div>
        </div>

        <div class="preview-panel">
          <h3>Previsualización del Correo</h3>
          <iframe ref="previewIframe" :style="{ width: previewWidth, height: '2100px', border: '1px solid #ccc', 'background-color': 'white' }"></iframe>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router'; // Para obtener el UUID de la URL

const route = useRoute();
const uuid = ref(route.params.uuid); // Usa ref para que sea reactivo si se quiere ver el UUID en la UI

const templateHtml = ref(''); // Aquí se guardará el HTML base del template
const editableContent = ref({}); // Objeto para el contenido editable (key-value)
const loading = ref(true); // Estado de carga
const error = ref(null); // Mensajes de error
const previewIframe = ref(null); // Referencia al iframe para manipular su contenido
const isSaving = ref(false); // Estado de guardado para deshabilitar botón
const previewWidth = ref('100%'); // Ancho de la previsualización (desktop por defecto)

// --- Funciones de Ayuda ---
// Capitaliza la primera letra de una cadena y reemplaza guiones bajos por espacios
const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).replace(/_/g, ' ');
};

// --- Lógica Principal del Editor ---

// Función para actualizar el contenido del iframe de previsualización
const updatePreview = () => {
  if (!previewIframe.value) {
    console.warn('previewIframe ref es null. No se puede actualizar la previsualización.');
    return;
  }
  if (!templateHtml.value) {
    console.warn('templateHtml.value es nulo. No hay template para previsualizar.');
    return;
  }

  let finalHtml = templateHtml.value; // Partimos del HTML base

  // Iteramos sobre el contenido editable y reemplazamos los placeholders
  for (const key in editableContent.value) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g'); // Regex para encontrar {{ campo }}
    let replacement = editableContent.value[key] || ''; // Obtener el valor actual del campo, o cadena vacía

    // Lógica para manejar enlaces vs. texto normal
    if (key.includes('enlace_')) {
      replacement = encodeURI(replacement); // Codifica la URL para evitar problemas
    } else {
      replacement = replacement.replace(/\n/g, '<br>'); // Convierte saltos de línea a <br> para HTML
    }
    
    finalHtml = finalHtml.replace(placeholder, replacement);
  }

  // Envolver el HTML final en una estructura de documento HTML básica
  // Esto es crucial para que el iframe lo renderice correctamente y para la compatibilidad con email
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Previsualización</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        /* Aquí puedes añadir estilos generales que afecten a la previsualización
           o que complementen los estilos inline de tu template.
           Para emails, la mayoría de los estilos deben estar inline. */
        body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f6f6f6; }
        h1, h2, h3, h4, h5, h6 { margin-top: 0; margin-bottom: 8px; } /* Ajuste de márgenes por defecto */
        p { margin-top: 0; margin-bottom: 1em; }
        a { color: #007bff; text-decoration: underline; }
        
        /* Estilos específicos para la estructura general si tu template no los tiene */
        .email-wrapper {
          max-width: 772px; /* Ancho máximo de tu template */
          margin: 0 auto;
          background-color: #ffffff; /* Fondo del email */
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Estilos para responsividad del iframe, no del email en sí */
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

  // Escribir el HTML en el iframe
  previewIframe.value.contentWindow.document.open();
  previewIframe.value.contentWindow.document.write(fullHtml);
  previewIframe.value.contentWindow.document.close();
};

// Cargar datos iniciales del correo editable y del template al montar el componente
onMounted(async () => {
  console.log('EmailEditor mounted. UUID:', uuid.value); // Depuración

  if (!uuid.value) {
    error.value = 'UUID de correo no proporcionado.';
    loading.value = false;
    return;
  }

  try {
    // 1. Obtener los datos del correo editable (incluye template_id y contenido_json)
    console.log('Fetching email editable data for UUID:', uuid.value); // Depuración
    const emailResponse = await axios.get(`http://localhost:3000/api/emails-editable/${uuid.value}`);
    const { template_id, content_json } = emailResponse.data;
    console.log('Email editable data received:', emailResponse.data); // Depuración

    // 2. Obtener el HTML del template base usando el template_id
    console.log('Fetching template HTML for ID:', template_id); // Depuración
    const templateResponse = await axios.get(`http://localhost:3000/api/templates/${template_id}`);
    templateHtml.value = templateResponse.data.html_content; // Asume que el backend devuelve { html_content: '...' }
    console.log('Template HTML received (first 200 chars):', templateHtml.value.substring(0, 200) + '...'); // Depuración

    // Asignar el contenido editable
    editableContent.value = content_json;

    // Generar la primera vista previa
    updatePreview(); 

  } catch (err) {
    console.error('Error al cargar datos del correo o template:', err);
    // Mejora el mensaje de error para el usuario
    if (err.response && err.response.status === 404) {
        error.value = 'Correo o template no encontrado. Verifica la URL.';
    } else {
        error.value = `Error al cargar. Asegúrate de que el backend está funcionando: ${err.message}`;
    }
  } finally {
    loading.value = false;
  }
});

// Función para guardar los cambios del contenido editable en el backend
const saveChanges = async () => {
  isSaving.value = true;
  try {
    await axios.put(`http://localhost:3000/api/emails-editable/${uuid.value}`, {
      updated_content: editableContent.value
    });
    alert('Cambios guardados exitosamente!');
  } catch (err) {
    console.error('Error al guardar cambios:', err);
    alert('Error al guardar cambios. Revisa la consola.');
  } finally {
    isSaving.value = false;
  }
};

// Función para copiar el HTML final al portapapeles
const copyHtmlToClipboard = () => {
  let finalHtml = templateHtml.value;
  for (const key in editableContent.value) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    let replacement = editableContent.value[key] || '';
    if (key.includes('enlace_')) {
      replacement = encodeURI(replacement);
    } else {
      replacement = replacement.replace(/\n/g, '<br>'); // Convertir saltos de línea para el HTML final
    }
    finalHtml = finalHtml.replace(placeholder, replacement);
  }

  // El HTML que se copia es el HTML con los placeholders reemplazados
  // No se le añaden los head/body/wrapper del iframe, ya que eso es para la previsualización
  const textToCopy = finalHtml; 

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      alert('HTML copiado al portapapeles!');
    })
    .catch(err => {
      console.error('Error al copiar HTML:', err);
      alert('Error al copiar HTML. Tu navegador podría requerir HTTPS o permisos específicos para copiar al portapapeles, o un botón clicado por el usuario.');
    });
};

// Función para cambiar el ancho de la previsualización (simulando desktop/mobile)
const setPreviewWidth = (type) => {
  if (type === 'desktop') {
    previewWidth.value = '772px'; // O el ancho estándar de tu template
  } else if (type === 'mobile') {
    previewWidth.value = '320px'; // Ancho típico de móvil
  }
  updatePreview(); // Re-renderizar para que el ancho se aplique
};
</script>

<style scoped>
.email-editor-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  font-family: Arial, sans-serif;
  min-height: 100vh; /* Para que ocupe toda la altura */
  background-color: #f0f2f5;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.editor-layout {
  display: flex;
  flex-wrap: wrap; /* Permite que los paneles se apilen en pantallas pequeñas */
  width: 100%;
  max-width: 1400px; /* Un poco más ancho para el layout de dos columnas */
  gap: 20px;
  margin-top: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.controls-panel {
  flex: 1; /* Ocupa el espacio restante */
  min-width: 300px; /* Ancho mínimo para el panel de controles */
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

.editable-field textarea,
.editable-field input[type="url"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 0.95em;
  min-height: 80px; /* Más altura para textareas */
  resize: vertical; /* Permite redimensionar verticalmente */
  background-color: #fff;
}

.editable-field input[type="url"] {
  min-height: unset; /* Reinicia para input */
  height: 38px; /* Altura estándar para input */
}

.button-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap; /* Para que los botones se envuelvan si no hay espacio */
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
    background-color: #28a745; /* Un color diferente para distinguirlo */
}
.generate-html-button:hover {
    background-color: #218838;
}

.preview-panel {
  flex: 2; /* Ocupa más espacio */
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #fff; /* Fondo blanco para la previsualización */
  padding: 20px;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
  min-width: 400px; /* Ancho mínimo para el panel de previsualización */
}

.preview-panel h3 {
  margin-top: 0;
  color: #555;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
  margin-bottom: 20px;
}


iframe {
  width: 100%; /* El ancho lo controla previewWidth */
  height: 2100px; /* Altura fija */
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  transition: width 0.3s ease-in-out; /* Animación al cambiar de ancho */
  max-width: 100%; /* Asegura que no se desborde */
}

.loading, .error {
  margin-top: 20px;
  font-size: 1.2em;
  color: #555;
  text-align: center;
}
.error {
  color: #dc3545; /* Color rojo para errores */
  font-weight: bold;
}

@media (max-width: 768px) {
    .editor-layout {
        flex-direction: column; /* Apila los paneles en móviles */
    }
    .controls-panel, .preview-panel {
        min-width: unset; /* Resetea el min-width */
        width: 100%; /* Ocupa todo el ancho */
    }
}
</style>