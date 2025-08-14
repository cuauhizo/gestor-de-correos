<template>
  <div class="card p-4 mt-5 mx-auto" style="max-width: 900px;">
    <h1 class="card-title text-center mb-4">Correos Editables Guardados</h1>

    <div v-if="loading" class="text-center text-secondary">Cargando lista de correos...</div>
    <div v-if="error" class="text-center text-danger">{{ error }}</div>

    <div v-if="!loading && !error">
      <p v-if="emails.length === 0" class="text-center">No hay correos editables guardados aún. <router-link to="/">Crea uno nuevo</router-link>.</p>

      <ul class="list-group">
        <li v-for="email in emails" :key="email.uuid" class="list-group-item d-flex justify-content-between align-items-center">
          <!-- <pre>{{ email }}</pre> -->
          <div class="flex-grow-1">
            <!-- <strong>UUID:</strong> {{ email.uuid }}<br> -->
            <strong>Nombre template:</strong> {{ email.template_name }}<br>
            <strong>Creado por:</strong> {{ email.creator_username || 'Usuario desconocido' }}<br>
            <strong>Última modificación por:</strong> {{ email.last_modifier_username || 'Usuario desconocido' }}<br>
            <strong>Última Actualización:</strong> {{ formatDate(email.updated_at) }}
          </div>
          <div class="d-flex gap-2">
            <button @click="handleEdit(email)" class="btn btn-primary btn-sm">
              Editar
            </button>
            <button @click="deleteEmail(email.uuid)" class="btn btn-danger btn-sm">Eliminar</button>
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
import axios from '../services/api.js';
import { useRouter } from 'vue-router';
import { formatDate } from '../utils/helpers.js';
import { useFeedback } from '../composables/useFeedback.js';

const emails = ref([]);
const loading = ref(true);
const error = ref(null);
const router = useRouter();
const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

const handleEdit = async (email) => {
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/emails-editable/${email.uuid}/lock`);
    showFeedback(response.data.message, 'success');
    router.push({ name: 'email-editor', params: { uuid: email.uuid } });
  } catch (err) {
    if (err.response?.status === 409) {
      showFeedback(err.response.data.message, 'error');
    } else {
      showFeedback('Error al intentar editar. Intenta de nuevo más tarde.', 'error');
    }
  }
};

const fetchEmails = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/emails-editable`);
    emails.value = response.data;
  } catch (err) {
    console.error('Error al cargar la lista de correos:', err);
    error.value = 'Error al cargar la lista de correos. Asegúrate de que el backend está funcionando.';
  } finally {
    loading.value = false;
  }
};

const deleteEmail = async (uuidToDelete) => {
  if (!confirm('¿Estás seguro de que quieres eliminar este correo editable?')) {
    return;
  }
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/emails-editable/${uuidToDelete}`);
    emails.value = emails.value.filter(email => email.uuid !== uuidToDelete);
    showFeedback('Correo eliminado exitosamente.', 'success');
  } catch (err) {
    console.error('Error al eliminar correo:', err);
    showFeedback('Error al eliminar correo. Revisa la consola.', 'error');
  }
};

onMounted(fetchEmails);
</script>

<style scoped>
/* (El bloque de estilos CSS para EmailList.vue se mantiene igual) */
</style>