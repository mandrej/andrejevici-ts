import type { RouteRecordRaw } from 'vue-router'
import { CONFIG } from '../helpers'
import Plain from 'layouts/Plain.vue'
import Default from 'src/layouts/Default.vue'
import IndexPage from '../pages/Index-Page.vue'
import BrowserPage from '../pages/Browser-Page.vue'
import Find from '../components/Find.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Plain,
    meta: { title: CONFIG.title },
    children: [{ path: '', name: 'home', component: IndexPage }],
  },
  {
    path: '/list',
    component: Default,
    meta: { title: CONFIG.title },
    children: [{ path: '', name: 'list', components: { default: BrowserPage, sidebar: Find } }],
  },
  {
    path: '/add',
    component: Default,
    meta: { title: 'Add', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'add',
        components: {
          default: () => import('../pages/Add-Page.vue'),
          sidebar: () => import('../components/Stat.vue'),
        },
      },
    ],
  },
  {
    path: '/admin',
    component: Default,
    meta: { title: 'Administration', requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin',
        components: {
          default: () => import('../pages/Admin-Page.vue'),
          sidebar: () => import('../components/Stat.vue'),
        },
      },
    ],
  },
  {
    path: '/401',
    component: Plain,
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '401',
        component: () => import('../pages/Error-Page.vue'),
        props: { code: 401 },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: Plain,
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '404',
        component: () => import('../pages/Error-Page.vue'),
        props: { code: 404 },
      },
    ],
  },
]

export default routes
