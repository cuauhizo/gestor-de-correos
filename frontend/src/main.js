// frontend/src/main.js
import './assets/main.css' // O tu CSS
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Importa tu router

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/js/bootstrap.bundle.js'

const app = createApp(App)
app.use(router) // <--- Asegúrate de que esta línea esté presente
app.mount('#app')