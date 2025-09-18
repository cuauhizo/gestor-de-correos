// frontend/src/stores/feedbackStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFeedbackStore = defineStore('feedback', () => {
  // --- State ---
  const message = ref(null)
  const type = ref('') // 'success' o 'error'
  let timeoutId = null

  // --- Action ---
  function show(newMessage, newType, duration = 3000) {
    message.value = newMessage
    type.value = newType

    // Si ya hay un mensaje mostrándose, limpiamos su temporizador
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Creamos un nuevo temporizador para ocultar el mensaje
    timeoutId = setTimeout(() => {
      message.value = null
      type.value = ''
    }, duration)
  }

  return { message, type, show }
})
