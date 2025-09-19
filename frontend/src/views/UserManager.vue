<template>
  <div class="container py-4" style="max-width: 900px">
    <h1 class="card-title text-center mb-4">Gestionar Usuarios</h1>

    <div class="card p-4 mb-4">
      <h2 class="h4 text-center mb-4">{{ editingUser.id ? 'Editar Usuario' : 'Añadir Nuevo Usuario' }}</h2>
      <form @submit.prevent="handleSaveUser">
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="username" class="form-label">Nombre de Usuario:</label>
            <input type="text" id="username" v-model="editingUser.username" required class="form-control" />
          </div>
          <div class="col-md-6 mb-3">
            <label for="role" class="form-label">Rol:</label>
            <select id="role" v-model="editingUser.role" required class="form-select">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="col-12 mb-3">
            <label for="password" class="form-label">Contraseña:</label>
            <input type="password" id="password" v-model="editingUser.password" :placeholder="editingUser.id ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'" class="form-control" />
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-center mt-3">
          <button type="submit" :disabled="isSaving" class="btn btn-success">
            {{ isSaving ? 'Guardando...' : editingUser.id ? 'Actualizar Usuario' : 'Crear Usuario' }}
          </button>
          <button type="button" @click="cancelEdit" v-if="editingUser.id" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>

    <hr class="my-5" />

    <div class="card p-4">
      <h2 class="h4 text-center mb-4">Usuarios Existentes</h2>
      <div v-if="userStore.loading" class="text-center text-secondary">Cargando...</div>
      <div v-if="userStore.error" class="text-center text-danger">{{ userStore.error }}</div>

      <ul class="list-group" v-if="!userStore.loading && !userStore.error">
        <li v-for="user in userStore.users" :key="user.id" class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>{{ user.username }}</strong>
            <span :class="['badge', user.role === 'admin' ? 'bg-primary' : 'bg-secondary', 'ms-2']">{{ user.role }}</span>
          </div>
          <div class="d-flex gap-2">
            <button @click="startEdit(user)" class="btn btn-primary btn-sm">Editar</button>
            <button @click="handleDeleteUser(user.id)" class="btn btn-danger btn-sm" :disabled="authStore.user?.id === user.id">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useUserStore } from '../stores/userStore.js'
  import { useAuthStore } from '../stores/auth.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import { useModalStore } from '../stores/modalStore.js'

  const userStore = useUserStore()
  const authStore = useAuthStore()
  const feedbackStore = useFeedbackStore()
  const modalStore = useModalStore()

  const isSaving = ref(false)
  const editingUser = ref({
    id: null,
    username: '',
    role: 'editor',
    password: '',
  })

  const resetForm = () => {
    editingUser.value = { id: null, username: '', role: 'editor', password: '' }
  }

  const handleSaveUser = async () => {
    isSaving.value = true
    let result

    const userData = {
      username: editingUser.value.username,
      role: editingUser.value.role,
    }
    // Solo incluimos la contraseña si se escribió algo
    if (editingUser.value.password) {
      userData.password = editingUser.value.password
    }

    if (editingUser.value.id) {
      // Actualizar
      result = await userStore.updateUser(editingUser.value.id, userData)
    } else {
      // Crear
      result = await userStore.createUser(userData)
    }

    feedbackStore.show(result.message, result.success ? 'success' : 'error')
    if (result.success) {
      resetForm()
    }
    isSaving.value = false
  }

  const startEdit = user => {
    editingUser.value = { ...user, password: '' } // Copiamos el usuario al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    resetForm()
  }

  const handleDeleteUser = id => {
    modalStore.show({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        // Esta es la lógica que se ejecutará si el usuario hace clic en "Aceptar"
        const result = await userStore.deleteUser(id)
        feedbackStore.show(result.message, result.success ? 'success' : 'error')
      },
      // No necesitamos un onCancel, ya que por defecto no hace nada.
    })
  }

  onMounted(() => {
    userStore.fetchUsers()
  })
</script>
<style scoped></style>
