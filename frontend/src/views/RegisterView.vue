<template>
  <div class="container mt-5" style="max-width: 400px">
    <div class="card p-4">
      <h1 class="text-center mb-4">Registro</h1>
      <div v-if="authStore.error" class="alert alert-danger">{{ authStore.error }}</div>
      <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <form @submit.prevent="handleRegister">
        <div class="mb-3">
          <label for="username" class="form-label">Nombre de Usuario</label>
          <input type="text" class="form-control" id="username" v-model="userData.username" required />
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Contraseña</label>
          <input type="password" class="form-control" id="password" v-model="userData.password" required />
        </div>
        <button type="submit" class="btn btn-primary w-100" :disabled="authStore.loading">
          <span v-if="authStore.loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          {{ authStore.loading ? 'Cargando...' : 'Registrarse' }}
        </button>
      </form>
      <p class="text-center mt-3">
        ¿Ya tienes una cuenta?
        <router-link to="/login">Inicia sesión</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useAuthStore } from '../stores/auth.js'

  const authStore = useAuthStore()
  const userData = ref({
    username: '',
    password: '',
  })
  const successMessage = ref(null)

  const handleRegister = async () => {
    const response = await authStore.register(userData.value)
    if (response) {
      successMessage.value = response.message
      userData.value.username = ''
      userData.value.password = ''
    }
  }
</script>
