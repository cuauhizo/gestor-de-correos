<template>
  <div class="card p-4 mt-5 mx-auto" style="max-width: 900px">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="card-title text-center mb-0">Correos Editables Guardados</h1>
      <router-link to="/" class="btn btn-success">Crear Nuevo</router-link>
    </div>

    <div class="mb-4" v-if="!emailStore.loading && !emailStore.error && emailStore.emails.length > 0">
      <input type="text" v-model="searchQuery" class="form-control" placeholder="Buscar por nombre de template, creador..." />
    </div>

    <div v-if="emailStore.loading" class="mb-4">
      <ul class="list-group">
        <li v-for="i in 4" :key="'skel-email-' + i" class="list-group-item d-flex justify-content-between align-items-center py-3">
          <div class="flex-grow-1">
            <SkeletonLoader width="40%" height="20px" class="mb-2 d-block" />
            <SkeletonLoader width="60%" height="15px" class="mb-1 d-block" />
            <SkeletonLoader width="50%" height="15px" class="d-block" />
          </div>
          <div class="d-flex flex-column gap-2">
            <SkeletonLoader width="80px" height="31px" radius="4px" />
            <SkeletonLoader width="80px" height="31px" radius="4px" />
          </div>
        </li>
      </ul>
    </div>

    <div v-if="emailStore.error" class="text-center text-danger">{{ emailStore.error }}</div>

    <div v-if="!emailStore.loading && !emailStore.error">
      <p v-if="emailStore.emails.length === 0" class="text-center text-secondary">No hay correos editables guardados aún.</p>
      <p v-else-if="filteredEmails.length === 0" class="text-center text-secondary">No se encontraron resultados para "{{ searchQuery }}".</p>

      <ul class="list-group" v-else>
        <li v-for="email in filteredEmails" :key="email.uuid" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center transition-hover">
          <div class="flex-grow-1">
            <strong class="text-primary fs-5">{{ email.template_name }}</strong>
            <br />
            <small class="text-muted">
              <strong>Creador:</strong>
              {{ email.creator_username || 'Desconocido' }} |
              <strong>Modificado por:</strong>
              {{ email.last_modifier_username || 'Desconocido' }}
            </small>
            <br />
            <small class="text-muted">
              <strong>Última Actualización:</strong>
              {{ formatDate(email.updated_at) }}
            </small>
            <br />
            <span v-if="email.locked_by" class="badge bg-warning text-dark mt-2">Bloqueado por: {{ email.locked_by_username || 'Usuario desconocido' }}</span>
          </div>
          <div class="d-flex flex-column gap-2 ms-3">
            <button @click="handleEditClick(email)" class="btn btn-primary btn-sm">Editar</button>
            <button v-if="authStore.isAdmin" @click="deleteEmailClick(email.uuid)" class="btn btn-outline-danger btn-sm">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useEmailStore } from '../stores/emailStore.js'
  import { useAuthStore } from '../stores/auth.js'
  import { formatDate } from '../utils/helpers.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import { useModalStore } from '../stores/modalStore.js'
  import SkeletonLoader from '../components/SkeletonLoader.vue'

  const emailStore = useEmailStore()
  const authStore = useAuthStore()
  const feedbackStore = useFeedbackStore()
  const modalStore = useModalStore()

  // Estado para el buscador
  const searchQuery = ref('')

  // Propiedad computada para filtrar los correos
  const filteredEmails = computed(() => {
    if (!searchQuery.value) return emailStore.emails
    const lowerCaseQuery = searchQuery.value.toLowerCase()
    return emailStore.emails.filter(email => {
      const templateName = (email.template_name || '').toLowerCase()
      const creator = (email.creator_username || '').toLowerCase()
      const modifier = (email.last_modifier_username || '').toLowerCase()
      return templateName.includes(lowerCaseQuery) || creator.includes(lowerCaseQuery) || modifier.includes(lowerCaseQuery)
    })
  })

  const handleEditClick = async email => {
    const result = await emailStore.handleEdit(email)
    if (!result.success && result.message) {
      feedbackStore.show(result.message, 'error')
    } else if (result.success && result.message) {
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

  onMounted(() => {
    emailStore.fetchEmails()
  })
</script>

<style scoped>
  /* Efecto sutil al pasar el mouse por las filas */
  .transition-hover {
    transition:
      background-color 0.2s ease,
      transform 0.1s ease;
  }
  .transition-hover:hover {
    background-color: #f8f9fa;
    transform: translateX(2px);
    border-left: 4px solid #0d6efd;
  }
</style>
