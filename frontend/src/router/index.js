// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import EmailEditor from '../views/EmailEditor.vue';
import HomeView from '../views/HomeView.vue'; // Una vista inicial
import EmailList from '../views/EmailList.vue'; // Una vista inicial
import TemplateManager from '../views/TemplateManager.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/editar-correo/:uuid',
      name: 'email-editor',
      component: EmailEditor,
      props: true // Permite pasar el uuid como prop al componente
    },
    {
      path: '/lista-correos', // <-- Añade esta nueva ruta
      name: 'email-list',
      component: EmailList
    },
    {
      path: '/gestionar-templates', // <-- Añade esta nueva ruta
      name: 'template-manager',
      component: TemplateManager
    },
    // Ruta comodín para 404
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
    },
  ]
});

export default router;

=========================================================

// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import HomeView from '../views/HomeView.vue'; // Una vista inicial
import EmailEditor from '../views/EmailEditor.vue';
import EmailList from '../views/EmailList.vue'; // Una vista inicial
import TemplateManager from '../views/TemplateManager.vue';
import LoginView from '../views/LoginView.vue'; // <-- Importa la vista de login
import RegisterView from '../views/RegisterView.vue'; // <-- Importa la vista de registro

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/editar-correo/:uuid', name: 'email-editor', component: EmailEditor, props: true, meta: { requiresAuth: true } },
    { path: '/lista-correos', name: 'email-list', component: EmailList, meta: { requiresAuth: true } },
    { path: '/gestionar-templates', name: 'template-manager', component: TemplateManager, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    // { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFound.vue')},
  ],
});

// --- Navegación Global Guard para proteger rutas ---
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' });
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    // Redirigir a la página de inicio si no es admin
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;