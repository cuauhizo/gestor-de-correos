<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useAuthStore } from './stores/auth.js';
import { useRouter } from 'vue-router';
import { useFeedback } from './composables/useFeedback.js';

const authStore = useAuthStore();
const router = useRouter();
const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

// Temporizador para manejar la inactividad del usuario
let timeout;
const INACTIVITY_TIME = 1000 * 60 * 15; // 15 minutos en milisegundos
// const INACTIVITY_TIME = 3000; // 15 minutos en milisegundos

// Función para reiniciar el temporizador de inactividad
const resetTimer = () => {
  clearTimeout(timeout);
  console.log(timeout);
  if (authStore.isAuthenticated) {
    timeout = setTimeout(logoutDueToInactivity, INACTIVITY_TIME);
  }
};

// Función para manejar el cierre de sesión por inactividad
const logoutDueToInactivity = () => {
  console.log('Sesión cerrada por inactividad.');
  authStore.logout();
  router.push({ name: 'login' });
  showFeedback('Su sesión se cerró por inactividad. Por favor, inicie sesión de nuevo.', 'error');
};

// Configurar los listeners de eventos para detectar actividad del usuario
onMounted(() => {
  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('keypress', resetTimer);
  window.addEventListener('click', resetTimer);
  window.addEventListener('scroll', resetTimer);
  resetTimer(); // Iniciar el temporizador al cargar la aplicación
});

// Limpiar los listeners antes de desmontar el componente para evitar fugas de memoria
onBeforeUnmount(() => {
  clearTimeout(timeout);
  window.removeEventListener('mousemove', resetTimer);
  window.removeEventListener('keypress', resetTimer);
  window.removeEventListener('click', resetTimer);
  window.removeEventListener('scroll', resetTimer);
});
</script>

<template>
  <div class="bg-light min-vh-100">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">Gestor de Correos</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <template v-if="authStore.isAuthenticated">
              <li class="nav-item" v-if="authStore.isAdmin">
                <router-link to="/" class="nav-link" active-class="active">Crear Nuevo Correo</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/lista-correos" class="nav-link" active-class="active">Ver Correos Guardados</router-link>
              </li>
              <li class="nav-item" v-if="authStore.isAdmin">
                <router-link to="/gestionar-templates" class="nav-link" active-class="active">Gestionar Templates</router-link>
              </li>
            </template>
          </ul>
          <ul class="navbar-nav ms-auto">
            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <router-link to="/login" class="nav-link" active-class="active">Iniciar Sesión</router-link>
            </li>
            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <router-link to="/register" class="nav-link" active-class="active">Registro</router-link>
            </li>
            <li class="nav-item" v-if="authStore.isAuthenticated">
              <span class="nav-link text-white">Hola, {{ authStore.user?.username }}!</span>
            </li>
            <li class="nav-item" v-if="authStore.isAuthenticated">
              <button @click="authStore.logout" class="btn btn-link nav-link">Cerrar Sesión</button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <main class="container-xxxl py-4">
      <router-view />
    </main>
     <div v-if="feedbackMessage" :class="['feedback-message', feedbackType]">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<style scoped>
.router-link-active,
.router-link-exact-active {
  font-weight: bold;
  color: white !important;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}
</style>