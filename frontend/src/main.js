// frontend/src/main.js
// Archivo de punto de entrada para la aplicación Vue.js

import { createApp } from 'vue';
import { createPinia } from 'pinia'; // Importa el gestor de estado Pinia
import App from './App.vue';
import router from './router'; // Importa la configuración de las rutas

// --- Importación de estilos globales ---
import './assets/main.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.js';

const app = createApp(App);
const pinia = createPinia();

// --- El orden es crucial para que todo funcione correctamente ---
// 1. Instancia de Pinia: Debe ser primero para que las guardias de navegación del router puedan acceder al store.
app.use(pinia);

// 2. Instancia del Router: Debe ser segundo para que tenga acceso al store de Pinia.
app.use(router);

// Monta la aplicación en el elemento con id="app"
app.mount('#app');