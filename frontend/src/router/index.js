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