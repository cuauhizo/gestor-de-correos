// frontend/src/utils/helpers.js

/**
 * Capitaliza la primera letra de una cadena y reemplaza guiones bajos por espacios.
 * @param {string} str La cadena a formatear.
 * @returns {string} La cadena formateada.
 */
export const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  // Reemplaza guiones bajos por espacios y luego capitaliza la primera letra de cada palabra
  // (útil si hay guiones bajos como separadores de palabras)
  return str.replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
};


/**
 * Formatea una cadena de fecha a un formato legible.
 * @param {string} dateString La cadena de fecha a formatear.
 * @returns {string} La fecha formateada o 'N/A'.
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

/**
 * Valida si una cadena es una URL válida.
 * @param {string} url La cadena a validar.
 * @returns {boolean} True si es una URL válida, false en caso contrario.
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Extrae texto plano de una cadena HTML.
 * @param {string} html La cadena HTML de la cual extraer el texto.
 * @returns {string} El texto plano extraído.
 */
export const getPlainTextFromHtml = (html) => {
  if (!html) return '';
  // Usamos DOMParser para una extracción de texto plano más robusta
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};