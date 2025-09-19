// frontend/src/stores/modalStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  // --- State ---
  const isVisible = ref(false)
  const title = ref('')
  const message = ref('')
  const onConfirm = ref(() => {}) // Función a ejecutar si se confirma
  const onCancel = ref(() => {}) // Función a ejecutar si se cancela

  // --- Actions ---
  function show(config) {
    title.value = config.title || 'Confirmar Acción'
    message.value = config.message || '¿Estás seguro?'
    onConfirm.value = config.onConfirm || (() => {})
    onCancel.value = config.onCancel || (() => {})
    isVisible.value = true
  }

  function hide() {
    isVisible.value = false
  }

  function handleConfirm() {
    onConfirm.value()
    hide()
  }

  function handleCancel() {
    onCancel.value()
    hide()
  }

  return {
    isVisible,
    title,
    message,
    show,
    handleConfirm,
    handleCancel,
  }
})
