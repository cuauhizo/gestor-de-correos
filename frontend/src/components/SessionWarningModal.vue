<template>
  <div v-if="show" class="modal fade show d-block" tabindex="-1" @click.self="close">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">¿Sigues ahí?</h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        <div class="modal-body">
          <p>Tu sesión está a punto de expirar por inactividad.</p>
          <p>La sesión se cerrará automáticamente en <strong class="text-danger">{{ countdown }}</strong> segundos.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="logout">Cerrar Sesión</button>
          <button type="button" class="btn btn-primary" @click="extendSession">Mantener Sesión</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="show" class="modal-backdrop fade show"></div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'extend', 'logout']);

const countdown = ref(60);
let interval;

// Inicia o detiene la cuenta regresiva cuando el modal se muestra/oculta
watch(() => props.show, (newValue) => {
  if (newValue) {
    countdown.value = 60;
    interval = setInterval(() => {
      countdown.value--;
      if (countdown.value === 0) {
        emit('logout'); // Emite el evento de logout si el tiempo se acaba
        close();
      }
    }, 1000);
  } else {
    clearInterval(interval);
  }
});

const close = () => {
  emit('close');
  clearInterval(interval);
};

const extendSession = () => {
  emit('extend');
  close();
};

const logout = () => {
  emit('logout');
  close();
}
</script>

<style scoped>
.d-block {
  display: block;
}
</style>