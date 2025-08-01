<template>
  <div class="home-container">
    <h1>Bienvenido al Creador de Correos</h1>

    <div v-if="loadingTemplates" class="loading">Cargando templates disponibles...</div>
    <div v-if="templatesError" class="error">{{ templatesError }}</div>

    <div v-if="!loadingTemplates && !templatesError">
      <div v-if="templates.length > 0" class="template-selection">
        <label for="selectTemplate">Selecciona un Template:</label>
        <select id="selectTemplate" v-model="selectedTemplateId">
          <option value="" disabled>-- Selecciona un template --</option>
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }} (ID: {{ template.id }})
          </option>
        </select>
        <p v-if="!selectedTemplateId && !loadingTemplates" class="validation-error">Por favor, selecciona un template para crear un correo.</p>
      </div>
      <p v-else class="info-message">No hay templates disponibles. Por favor, <router-link to="/gestionar-templates">añade un template primero</router-link>.</p>
      
      <button 
        @click="createNewEmail" 
        :disabled="!selectedTemplateId || isCreatingEmail"
      >
        {{ isCreatingEmail ? 'Creando...' : 'Crear Nuevo Correo Editable' }}
      </button>
      <p v-if="newEmailUrl" class="success-message">
        Enlace de edición: <a :href="newEmailUrl" target="_blank">{{ newEmailUrl }}</a>
      </p>
      <p v-if="creationError" class="error-message">{{ creationError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const newEmailUrl = ref('');
const creationError = ref(null);
const isCreatingEmail = ref(false);

const templates = ref([]);
const loadingTemplates = ref(true);
const templatesError = ref(null);
const selectedTemplateId = ref(''); // Para almacenar el ID del template seleccionado

// Función para cargar la lista de templates desde el backend
const fetchTemplates = async () => {
  loadingTemplates.value = true;
  templatesError.value = null;
  try {
    const response = await axios.get('http://localhost:3000/api/templates');
    templates.value = response.data;
    if (templates.value.length > 0) {
      selectedTemplateId.value = templates.value[0].id; // Seleccionar el primer template por defecto
    }
  } catch (err) {
    console.error('Error al cargar templates:', err);
    templatesError.value = 'Error al cargar templates. Asegúrate de que el backend está funcionando.';
  } finally {
    loadingTemplates.value = false;
  }
};

const createNewEmail = async () => {
  console.log('--- createNewEmail function called ---');
  creationError.value = null; // Limpiar errores previos

  if (!selectedTemplateId.value) {
    creationError.value = 'Por favor, selecciona un template para crear un correo.';
    return;
  }

  isCreatingEmail.value = true;
  try {
    // Nota: El initial_content que se envía aquí debe contener los placeholders
    // que TU template seleccionado espera. Si tus templates tienen placeholders muy diferentes,
    // este initial_content DEBERÍA cargarse dinámicamente basado en el template
    // (lo cual es más avanzado). Por ahora, asumimos un conjunto común de placeholders.
    const response = await axios.post('http://localhost:3000/api/emails-editable', {
      template_id: selectedTemplateId.value, // Usar el template seleccionado
      initial_content: {
        // Asegúrate de que este contenido inicial sea HTML si tu template y TipTap lo esperan
        // y que cubra los placeholders más comunes de tus templates.
        titulo_principal: '<h2>Título principal por defecto (Editable)</h2>',
        parrafo_principal: '<p>Este es un párrafo de texto por defecto que puedes modificar con el editor WYSIWYG.</p>',
        url_imagen_principal: 'https://via.placeholder.com/680x200?text=Imagen+Principal', // URL de placeholder
        // ... (añade todos los placeholders que tengas en tus templates aquí con valores por defecto)
        titulo_columna_izquierda: '<h2>Título de Columna Izquierda (Editable)</h2>',
        parrafo_columna_izquierda: '<p>Contenido de la columna izquierda.</p>',
        enlace_columna_izquierda: 'https://ejemplo.com/enlace-izquierdo',
        url_imagen_izquierda: 'https://via.placeholder.com/332x150?text=Imagen+Izq',
        titulo_columna_derecha: '<h2>Título de Columna Derecha (Editable)</h2>',
        parrafo_columna_derecha: '<p>Contenido de la columna derecha.</p>',
        url_imagen_derecha: 'https://via.placeholder.com/332x150?text=Imagen+Der',
        titulo_inferior: '<h2>Título Inferior (Editable)</h2>',
        parrafo_inferior: '<p>Párrafo de la sección inferior.</p>',
        enlace_inferior: 'https://ejemplo.com/enlace-inferior',
        enlace_encuesta: 'https://ejemplo.com/encuesta',
        titulo_agenda_deportiva: '<strong>AGENDA DEPORTIVA (Editable)</strong>',
        titulo_pumas: '<h2>PUMAS (Editable)</h2>',
        parrafo_pumas: '<p>Detalles sobre Pumas.</p>',
        titulo_nfl: '<h2>NFL (Editable)</h2>',
        parrafo_nfl: '<p>Detalles sobre NFL.</p>'
      }
    });
    const { uuid } = response.data;
    newEmailUrl.value = `${window.location.origin}/editar-correo/${uuid}`;
  } catch (error) {
    console.error('Error al crear nuevo correo editable:', error);
    creationError.value = 'Error al crear correo. Revisa la consola y asegúrate de que el template seleccionado sea válido.';
  } finally {
    isCreatingEmail.value = false;
  }
};

onMounted(fetchTemplates);
</script>

<style scoped>
.home-container {
  padding: 20px;
  max-width: 600px;
  margin: 50px auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 30px;
}

.template-selection {
  margin-bottom: 25px;
}

.template-selection label {
  display: block;
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #555;
}

.template-selection select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1em;
  background-color: #f9f9f9;
}

button {
  background-color: #007bff;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1em;
  transition: background-color 0.3s ease;
  margin-top: 20px;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading, .error {
  margin-top: 20px;
  font-size: 1.2em;
  color: #555;
}

.error {
  color: #dc3545;
  font-weight: bold;
}

.success-message {
  margin-top: 20px;
  color: #28a745;
  font-weight: bold;
  word-break: break-all; /* Para que la URL larga se rompa */
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  font-weight: bold;
}

.validation-error {
  color: #dc3545;
  font-size: 0.9em;
  margin-top: 5px;
}

.info-message {
    color: #6c757d;
    margin-top: 20px;
}
</style>