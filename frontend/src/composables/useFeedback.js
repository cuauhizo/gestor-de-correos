// frontend/src/composables/useFeedback.js
import { ref } from 'vue';

/**
 * Composable para manejar mensajes de feedback visual (éxito/error).
 * Proporciona un mensaje, tipo de mensaje y una función para mostrarlos temporalmente.
 */
export function useFeedback() {
  const feedbackMessage = ref(null);
  const feedbackType = ref(''); // 'success' o 'error'
  let feedbackTimeout = null;

  /**
   * Muestra un mensaje de feedback.
   * @param {string} message El mensaje a mostrar.
   * @param {'success' | 'error'} type El tipo de mensaje (para aplicar estilos).
   * @param {number} duration La duración en milisegundos que el mensaje estará visible.
   */
  const showFeedback = (message, type, duration = 3000) => {
    feedbackMessage.value = message;
    feedbackType.value = type;

    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
    }
    feedbackTimeout = setTimeout(() => {
      feedbackMessage.value = null;
      feedbackType.value = '';
    }, duration);
  };

  return {
    feedbackMessage,
    feedbackType,
    showFeedback
  };
}