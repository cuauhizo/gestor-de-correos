<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useAuthStore } from './stores/auth.js';
import { useRouter } from 'vue-router';
import { useFeedback } from './composables/useFeedback.js';
import SessionWarningModal from './components/SessionWarningModal.vue'; // 1. Importa el nuevo componente

const authStore = useAuthStore();
const router = useRouter();
const { feedbackMessage, feedbackType, showFeedback } = useFeedback();

// --- Lógica de Inactividad ---
const showWarningModal = ref(false); // 2. Estado para controlar la visibilidad del modal

let inactivityTimer;
let warningTimer;
const INACTIVITY_TIME = 1000 * 60 * 30; // 30 minutos en milisegundos
const WARNING_TIME = 1000 * 60; // 1 minuto (60,000 ms) para la advertencia

// Función que se ejecuta cuando el tiempo de inactividad se cumple
const logoutDueToInactivity = () => {
  console.log('Sesión cerrada por inactividad.');
  authStore.logout();
  router.push({ name: 'login' });
  showFeedback('Tu sesión se cerró por inactividad. Por favor, inicia sesión de nuevo.', 'error');
};

// Función para mostrar el modal de advertencia
const showInactivityWarning = () => {
  console.log('Mostrando advertencia de inactividad.');
  showWarningModal.value = true;
  // Inicia el temporizador final para cerrar la sesión si no hay respuesta
  inactivityTimer = setTimeout(logoutDueToInactivity, WARNING_TIME);
};

// 3. Función para reiniciar TODOS los temporizadores
const resetTimers = () => {
  // Limpia los temporizadores anteriores
  clearTimeout(warningTimer);
  clearTimeout(inactivityTimer);

  // Si el usuario está autenticado, reinicia el ciclo
  if (authStore.isAuthenticated) {
    // El temporizador de advertencia se activará 1 minuto antes del cierre de sesión
    warningTimer = setTimeout(showInactivityWarning, INACTIVITY_TIME - WARNING_TIME);
  }
};

// 4. Función para manejar la extensión de la sesión desde el modal
const handleExtendSession = () => {
  console.log('El usuario eligió extender la sesión.');
  showWarningModal.value = false; // Oculta el modal
  resetTimers(); // Reinicia todo el ciclo de temporizadores
};

// 5. Función para manejar el cierre de sesión desde el modal
const handleLogout = () => {
  showWarningModal.value = false;
  logoutDueToInactivity();
};

// Configurar los listeners de eventos para detectar actividad del usuario
onMounted(() => {
  window.addEventListener('mousemove', resetTimers);
  window.addEventListener('keypress', resetTimers);
  window.addEventListener('click', resetTimers);
  window.addEventListener('scroll', resetTimers);
  resetTimers(); // Iniciar el ciclo de temporizadores al cargar la aplicación
});

// Limpiar los listeners antes de desmontar el componente
onBeforeUnmount(() => {
  clearTimeout(warningTimer);
  clearTimeout(inactivityTimer);
  window.removeEventListener('mousemove', resetTimers);
  window.removeEventListener('keypress', resetTimers);
  window.removeEventListener('click', resetTimers);
  window.removeEventListener('scroll', resetTimers);
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

  <SessionWarningModal
    :show="showWarningModal"
    @close="showWarningModal = false"
    @extend="handleExtendSession"
    @logout="handleLogout"
  />
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