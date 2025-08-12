<script setup>
</script>

<template>
  <div class="bg-light min-vh-100"> <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">Gestor de Correos</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <router-link to="/" class="nav-link">Crear Nuevo Correo</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/lista-correos" class="nav-link">Ver Correos Guardados</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/gestionar-templates" class="nav-link">Gestionar Templates</router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <main class="container-fluid mt-4"> <router-view />
    </main>
  </div>
</template>

<style scoped>

.router-link-active {
  font-weight: bold;
  color: white !important; /* Asegura que el color activo sea visible */
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}
</style>