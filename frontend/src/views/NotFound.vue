<template>
  <div class="text-dark">
    <div class="d-flex align-items-center justify-content-center min-vh-100 px-2">
      <div class="text-center" data-aos="fade-right" data-aos-anchor-placement="top-bottom">
        <h1 class="display-1 fw-bold">404</h1>
        <p class="fs-2 fw-medium mt-4" data-aos="fade-left">¡Ups! Página no encontrada</p>
        <p class="mt-4 mb-5">Lo sentimos, la página que buscas no existe.</p>
        <router-link to="/" class="btn btn-light fw-semibold rounded-pill px-4 py-2 custom-btn">Ir a inicio</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .custom-btn:hover {
    background-color: #f3e8ff !important;
    transition: background-color 0.3s ease-in-out;
  }

  @media (prefers-color-scheme: dark) {
    .custom-bg {
      background: linear-gradient(to right, #1f2937, #111827);
      color: white !important;
    }

    .custom-btn {
      background-color: #374151 !important;
      color: white !important;
    }

    .custom-btn:hover {
      background-color: #4b5563 !important;
    }
  }
</style>
