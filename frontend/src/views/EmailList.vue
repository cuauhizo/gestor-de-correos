<template>
  <div class="email-list-container">
    <h1>Correos Editables Guardados</h1>

    <div v-if="loading" class="loading">Cargando lista de correos...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && !error">
      <p v-if="emails.length === 0">No hay correos editables guardados aún. <router-link to="/">Crea uno nuevo</router-link>.</p>

      <ul class="email-list">
        <li v-for="email in emails" :key="email.uuid" class="email-item">
          <div class="email-info">
            <strong>UUID:</strong> {{ email.uuid }}<br>
            <strong>Template ID:</strong> {{ email.template_id }} ({{ getTemplateName(email.template_id) }})<br>
            <strong>Nombre:</strong> {{ email.name }}<br>
            <strong>Última Actualización:</strong> {{ formatDate(email.updated_at) }}
          </div>
          <div class="email-actions">
            <router-link :to="{ name: 'email-editor', params: { uuid: email.uuid } }" class="action-button view-button">Editar</router-link>
            <button @click="deleteEmail(email.uuid)" class="action-button delete-button">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="feedbackMessage" :class="['feedback-message', feedbackType]">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'; // Para forzar una recarga si se elimina
import { formatDate } from '../utils/helpers.js';
import { useFeedback } from '../composables/useFeedback.js';

const emails = ref([]);
const templates = ref([]);
const loading = ref(true);
const error = ref(null);
const router = useRouter(); // Para recargar la lista después de eliminar
const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

// Nueva función para obtener el nombre del template por su ID
const getTemplateName = (templateId) => {
  const template = templates.value.find(t => t.id === templateId);
  return template ? template.name : 'Desconocido';
};

// Función para cargar la lista de correos
const fetchEmails = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await axios.get('http://localhost:3000/api/emails-editable');
    emails.value = response.data;
  } catch (err) {
    console.error('Error al cargar la lista de correos:', err);
    error.value = 'Error al cargar la lista de correos. Asegúrate de que el backend está funcionando.';
  } finally {
    loading.value = false;
  }
};

// Función para cargar la lista de templates (ya la tenemos en el backend)
const fetchTemplatesList = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/templates');
    templates.value = response.data;
  } catch (err) {
    console.error('Error al cargar la lista de templates:', err);
    // No hay que detener el loading completo aquí, solo mostrar un error específico si se desea
  }
};

// Función para eliminar un correo
const deleteEmail = async (uuidToDelete) => {
  if (!confirm('¿Estás seguro de que quieres eliminar este correo editable?')) {
    return;
  }
  try {
    await axios.delete(`http://localhost:3000/api/emails-editable/${uuidToDelete}`);
    // Actualizar la lista después de eliminar
    emails.value = emails.value.filter(email => email.uuid !== uuidToDelete);
    // alert('Correo eliminado exitosamente.'); // Se puede reemplazar por feedback visual
    showFeedback('Correo eliminado exitosamente.', 'success');
  } catch (err) {
    console.error('Error al eliminar correo:', err);
    alert('Error al eliminar correo. Revisa la consola.'); // Se puede reemplazar por feedback visual
  }
};

// Cargar la lista al montar el componente
// onMounted(fetchEmails);
onMounted(async () => {
  loading.value = true;
  await Promise.all([
    fetchEmails(),
    fetchTemplatesList() // Carga la lista de templates
  ]);
  loading.value = false;
});
</script>

<style scoped>
.email-list-container {
  padding: 20px;
  max-width: 900px;
  margin: 20px auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
}

.email-list {
  list-style: none;
  padding: 0;
}

.email-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
  transition: background-color 0.2s ease;
}

.email-item:hover {
  background-color: #f0f0f0;
}

.email-info {
  flex-grow: 1;
  color: #555;
}

.email-info strong {
  color: #333;
}

.email-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  text-decoration: none; /* Para router-link */
  display: inline-flex; /* Para router-link como botón */
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.view-button {
  background-color: #007bff;
  color: white;
}

.view-button:hover {
  background-color: #0056b3;
}

.delete-button {
  background-color: #dc3545;
  color: white;
}

.delete-button:hover {
  background-color: #c82333;
}

.loading, .error {
  text-align: center;
  margin-top: 20px;
  font-size: 1.1em;
  color: #555;
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