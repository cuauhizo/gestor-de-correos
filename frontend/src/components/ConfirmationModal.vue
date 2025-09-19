<template>
  <div v-if="modalStore.isVisible" class="modal-backdrop fade show"></div>
  <div v-if="modalStore.isVisible" class="modal fade show d-block" tabindex="-1" @click.self="modalStore.handleCancel">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ modalStore.title }}</h5>
          <button type="button" class="btn-close" @click="modalStore.handleCancel"></button>
        </div>
        <div class="modal-body">
          <p>{{ modalStore.message }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="modalStore.handleCancel">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="modalStore.handleConfirm">Aceptar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useModalStore } from '../stores/modalStore'
  const modalStore = useModalStore()
</script>

<style scoped>
  /* El `d-block` es para forzar que el modal de Bootstrap sea visible */
  .d-block {
    display: block;
  }
</style>
