<script setup>
import { useAuthStore } from './stores/auth.js';
const authStore = useAuthStore();
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
              <li class="nav-item" v-if="authStore.isAdmin">
                <router-link to="/" class="nav-link" active-class="active">Crear Nuevo Correo</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/lista-correos" class="nav-link" active-class="active">Ver Correos Guardados</router-link>
              </li>
              <li class="nav-item" v-if="authStore.isAdmin">
                <router-link to="/gestionar-templates" class="nav-link" active-class="active">Gestionar Templates</router-link>
              </li>
            </template>
          </ul>
          <ul class="navbar-nav ms-auto">
            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <router-link to="/login" class="nav-link" active-class="active">Iniciar Sesión</router-link>
            </li>
            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <router-link to="/register" class="nav-link" active-class="active">Registro</router-link>
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
    <main class="container-xxxl py-4">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.router-link-active,
.router-link-exact-active {
  font-weight: bold;
  color: white !important;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}
</style>