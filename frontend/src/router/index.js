// frontend/src/router/index.js
// Archivo de configuración principal de Vue Router.
// Define las rutas de la aplicación y las guardias de navegación para la autenticación y autorización.

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js' // Importa el store de autenticación de Pinia

// Importa todas las vistas (páginas) de la aplicación
import HomeView from '../views/HomeView.vue'
import EmailEditor from '../views/EmailEditor.vue'
import EmailList from '../views/EmailList.vue'
import TemplateManager from '../views/TemplateManager.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import NotFound from '../views/NotFound.vue' // Vista para manejar rutas no encontradas (404)
import UserManager from '../views/UserManager.vue'
import SectionTemplateManager from '../views/SectionTemplateManager.vue'
import DashboardView from '../views/DashboardView.vue'
import CreateEmailView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- Rutas Protegidas ---
    // Estas rutas requieren que el usuario esté autenticado para ser accesibles.
    {
      path: '/', // La raíz ahora es el dashboard
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/crear-correo', // La antigua página de inicio ahora vive aquí
      name: 'create-email',
      component: CreateEmailView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/editar-correo/:uuid',
      name: 'email-editor',
      component: EmailEditor,
      props: true,
      meta: { requiresAuth: true }, // Cualquier usuario autenticado puede editar un correo
    },
    {
      path: '/lista-correos',
      name: 'email-list',
      component: EmailList,
      meta: { requiresAuth: true }, // Cualquier usuario autenticado puede ver la lista
    },
    {
      path: '/gestionar-templates',
      name: 'template-manager',
      component: TemplateManager,
      meta: { requiresAuth: true, requiresAdmin: true }, // Solo el admin puede gestionar templates
    },
    {
      path: '/gestionar-usuarios', // <-- AÑADE ESTA RUTA
      name: 'user-manager',
      component: UserManager,
      meta: { requiresAuth: true, requiresAdmin: true }, // Solo admin
    },
    {
      path: '/gestionar-secciones', // <-- AÑADE ESTA RUTA
      name: 'section-template-manager',
      component: SectionTemplateManager,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    // --- Rutas Públicas ---
    // Estas rutas no requieren autenticación
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },

    // --- Ruta 'Catch-all' para errores 404 ---
    // Esta ruta debe ser la última en la lista para que actúe como fallback
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: NotFound,
    },
  ],
})

// --- Guardia de Navegación Global ---
// Se ejecuta antes de cada cambio de ruta para verificar los permisos del usuario
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 1. Si la ruta requiere autenticación y el usuario no está logueado, redirige al login.
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  // 2. Si la ruta requiere rol de admin y el usuario no lo tiene, redirige al home.
  else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'home' })
  }

  // 3. Si las condiciones se cumplen o la ruta es pública, permite la navegación.
  next()
})

export default router
