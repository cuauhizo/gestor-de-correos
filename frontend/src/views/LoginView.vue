<template>
  <div class="container mt-5" style="max-width: 400px;">
    <div class="card p-4">
      <h1 class="text-center mb-4">Iniciar Sesión</h1>
      <div v-if="authStore.error" class="alert alert-danger">{{ authStore.error }}</div>
      <form @submit.prevent="handleLogin">
        <div class="mb-3">
          <label for="username" class="form-label">Nombre de Usuario</label>
          <input type="text" class="form-control" id="username" v-model="credentials.username" required>
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Contraseña</label>
          <input type="password" class="form-control" id="password" v-model="credentials.password" required>
        </div>
        <button type="submit" class="btn btn-primary w-100" :disabled="authStore.loading">
          <span v-if="authStore.loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          {{ authStore.loading ? 'Cargando...' : 'Entrar' }}
        </button>
      </form>
      <p class="text-center mt-3">¿No tienes una cuenta? <router-link to="/register">Regístrate aquí</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();
const credentials = ref({
  username: '',
  password: '',
});

const handleLogin = () => {
  authStore.login(credentials.value);
};
</script>