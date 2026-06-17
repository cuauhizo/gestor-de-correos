<template>
  <div>
    <div class="p-4 bg-light rounded-3 mb-4">
      <div class="container-fluid py-3">
        <h1 class="display-5 fw-bold">Bienvenido al Gestor de Correos</h1>
        <p class="col-md-8 fs-4">Desde aquí puedes acceder a las funciones principales de la aplicación.</p>
      </div>

      <div class="row align-items-md-stretch">
        <div class="col-md-6 mb-4">
          <div class="h-100 p-5 text-white bg-dark rounded-3 d-flex flex-column justify-content-center">
            <h2>Acciones Rápidas</h2>
            <p>Crea un nuevo correo desde una plantilla o revisa la lista de correos existentes.</p>
            <div class="d-flex flex-wrap gap-4 mt-3">
              <router-link to="/crear-correo" class="btn btn-primary btn-lg" v-if="authStore.isAdmin">
                <i-bi-plus-circle-fill class="me-2" />
                Nuevo Correo
              </router-link>
              <router-link to="/lista-correos" class="btn btn-outline-light btn-lg">
                <i-bi-card-list class="me-2" />
                Ver Correos Guardados
              </router-link>
            </div>
          </div>
        </div>

        <div class="col-md-6 mb-4">
          <div class="h-100 p-5 bg-light border rounded-3">
            <h2>Estadísticas</h2>
            <p>Un resumen del contenido actual en la plataforma.</p>

            <div v-if="dashboardStore.loading" class="row mt-3">
              <div class="col-4 text-center">
                <SkeletonLoader width="60px" height="55px" radius="8px" class="mb-2 d-block mx-auto" />
                <SkeletonLoader width="70%" height="20px" class="d-block mx-auto" />
              </div>
              <div class="col-4 text-center">
                <SkeletonLoader width="60px" height="55px" radius="8px" class="mb-2 d-block mx-auto" />
                <SkeletonLoader width="70%" height="20px" class="d-block mx-auto" />
              </div>
              <div class="col-4 text-center">
                <SkeletonLoader width="60px" height="55px" radius="8px" class="mb-2 d-block mx-auto" />
                <SkeletonLoader width="70%" height="20px" class="d-block mx-auto" />
              </div>
            </div>

            <div v-else class="row mt-3">
              <div class="col-4 text-center">
                <h3 class="display-4">{{ dashboardStore.totals.emails }}</h3>
                <p class="lead">Correos</p>
              </div>
              <div class="col-4 text-center">
                <h3 class="display-4">{{ dashboardStore.totals.templates }}</h3>
                <p class="lead">Templates</p>
              </div>
              <div class="col-4 text-center">
                <h3 class="display-4">{{ dashboardStore.totals.users }}</h3>
                <p class="lead">Usuarios</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <h2 class="mb-3">Correos Editados Recientemente</h2>

        <ul class="list-group" v-if="dashboardStore.loading">
          <li v-for="i in 5" :key="'recent-skel-' + i" class="list-group-item d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
              <SkeletonLoader width="40%" height="20px" class="mb-1 d-block" />
              <SkeletonLoader width="60%" height="16px" class="d-block" />
            </div>
            <SkeletonLoader width="65px" height="31px" radius="4px" />
          </li>
        </ul>

        <div v-else-if="dashboardStore.recentEmails.length === 0" class="text-center text-muted py-3">No hay correos recientes. ¡Crea uno nuevo!</div>
        <ul class="list-group" v-else>
          <li v-for="email in dashboardStore.recentEmails" :key="email.uuid" class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>{{ email.template_name }}</strong>
              <br />
              <small class="text-muted">Última modificación: {{ formatDate(email.updated_at) }} por {{ email.last_modifier_username || 'desconocido' }}</small>
            </div>
            <router-link :to="{ name: 'email-editor', params: { uuid: email.uuid } }" class="btn btn-sm btn-outline-primary">Editar</router-link>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted } from 'vue'
  import { useDashboardStore } from '../stores/dashboardStore.js'
  import { useAuthStore } from '../stores/auth.js'
  import { formatDate } from '../utils/helpers.js'
  import SkeletonLoader from '../components/SkeletonLoader.vue' // <-- IMPORTAR COMPONENTE

  const dashboardStore = useDashboardStore()
  const authStore = useAuthStore()

  onMounted(() => {
    dashboardStore.fetchDashboardData()
  })
</script>
