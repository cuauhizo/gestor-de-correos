<template>
  <div class="card p-4 mt-5 mx-auto" style="max-width: 900px">
    <h1 class="card-title text-center mb-4">Correos Editables Guardados</h1>

    <div v-if="emailStore.loading" class="text-center text-secondary">Cargando lista de correos...</div>
    <div v-if="emailStore.error" class="text-center text-danger">{{ emailStore.error }}</div>
    <div v-if="!emailStore.loading && !emailStore.error">
      <p v-if="emailStore.emails.length === 0" class="text-center">
        No hay correos editables guardados aún.
        <router-link to="/">Crea uno nuevo</router-link>
        .
      </p>
      <ul class="list-group">
        <li v-for="email in emailStore.emails" :key="email.uuid" class="list-group-item d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <strong>Nombre template:</strong>
            {{ email.template_name }}
            <br />
            <strong>Creado por:</strong>
            {{ email.creator_username || 'Usuario desconocido' }}
            <br />
            <strong>Última modificación por:</strong>
            {{ email.last_modifier_username || 'Usuario desconocido' }}
            <br />
            <strong>Última Actualización:</strong>
            {{ formatDate(email.updated_at) }}
          </div>
          <div class="d-flex gap-2">
            <button @click="handleEditClick(email)" class="btn btn-primary btn-sm">Editar</button>
            <button v-if="authStore.isAdmin" @click="deleteEmailClick(email.uuid)" class="btn btn-danger btn-sm">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { onMounted } from 'vue'
  import { useEmailStore } from '../stores/emailStore.js' // <-- Importamos el store
  import { useAuthStore } from '../stores/auth.js'
  import { formatDate } from '../utils/helpers.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import { useModalStore } from '../stores/modalStore.js'

  // --- Instancias ---
  const emailStore = useEmailStore()
  const authStore = useAuthStore()
  const feedbackStore = useFeedbackStore()
  const modalStore = useModalStore()

  // --- Lógica del Componente ---
  const handleEditClick = async email => {
    const result = await emailStore.handleEdit(email)
    if (!result.success && result.message) {
      feedbackStore.show(result.message, 'error')
    } else if (result.success && result.message) {
      // Este caso es para el desbloqueo forzado exitoso
      feedbackStore.show(result.message, 'success')
    }
  }

  const deleteEmailClick = uuidToDelete => {
    modalStore.show({
      title: 'Eliminar Correo',
      message: '¿Estás seguro de que quieres eliminar este correo editable?',
      onConfirm: async () => {
        const result = await emailStore.deleteEmail(uuidToDelete)
        feedbackStore.show(result.message, result.success ? 'success' : 'error')
      },
    })
  }

  // --- Ciclo de Vida ---
  onMounted(() => {
    emailStore.fetchEmails()
  })
</script>

<style scoped></style>
