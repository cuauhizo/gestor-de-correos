// frontend/src/main.js
import './assets/main.css' // O tu CSS
import { createApp } from 'vue'
import { createPinia } from 'pinia';
import App from './App.vue'
import router from './router' // Importa tu router

// --- Nuevas líneas para usar Bootstrap ---
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.js';

const app = createApp(App)
const pinia = createPinia();

app.use(pinia);
app.use(router) // <--- Asegúrate de que esta línea esté presente
app.mount('#app')