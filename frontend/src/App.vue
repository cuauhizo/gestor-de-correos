<script setup>
import { useAuthStore } from './stores/auth.js'; // <-- Importa el store
const authStore = useAuthStore(); // <-- Instancia el store
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
              <li class="nav-item">
                <router-link to="/" class="nav-link">Crear Nuevo Correo</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/lista-correos" class="nav-link">Ver Correos Guardados</router-link>
              </li>
              <li class="nav-item" v-if="authStore.isAdmin">
                <router-link to="/gestionar-templates" class="nav-link">Gestionar Templates</router-link>
              </li>
            </template>
          </ul>
          <ul class="navbar-nav ms-auto">
            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <router-link to="/login" class="nav-link">Iniciar Sesión</router-link>
            </li>
            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <router-link to="/register" class="nav-link">Registro</router-link>
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
    <main class="container mt-4">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

.main-nav {
  display: flex;
  justify-content: center;
  padding: 15px;
  background-color: #333;
  gap: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}
.nav-link {
  color: white;
  text-decoration: none;
  font-weight: bold;
  padding: 8px 15px;
  border-radius: 5px;
  transition: background-color 0.2s ease;
}
.nav-link:hover {
  background-color: #555;
}
.nav-link.router-link-active {
  background-color: #007bff;
}

</style>
