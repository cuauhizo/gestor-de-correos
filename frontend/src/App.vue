<script setup>
</script>

<template>
  <main>
    <header>
      <img alt="Tolko logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />
    </header>
    <nav class="main-nav">
      <router-link to="/" class="nav-link">Crear Nuevo Correo</router-link>
      <router-link to="/lista-correos" class="nav-link">Ver Correos Guardados</router-link>
      <router-link to="/gestionar-templates" class="nav-link">Gestionar Templates</router-link> 
    </nav>
    <router-view />
  </main>
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
