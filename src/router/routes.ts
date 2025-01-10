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
    children: [
      {
        path: '',
        name: 'home',
        meta: { title: CONFIG.title },
        component: IndexPage,
      },
      {
        path: '401',
        name: '401',
        meta: { title: CONFIG.title },
        component: () => import('../pages/Error-Page.vue'),
        props: { code: 401 },
      },
      // Always leave this as last one,
      // but you can also remove it
      {
        path: ':catchAll(.*)*',
        name: '404',
        meta: { title: CONFIG.title },
        component: () => import('../pages/Error-Page.vue'),
        props: { code: 404 },
      },
    ],
  },
  {
    path: '/',
    component: Default,
    children: [
      {
        path: 'list',
        name: 'list',
        meta: { title: CONFIG.title },
        components: {
          default: BrowserPage,
          sidebar: Find,
        },
      },
      {
        path: 'add',
        name: 'add',
        meta: { title: 'Add', requiresAuth: true },
        components: {
          default: () => import('../pages/Add-Page.vue'),
          sidebar: () => import('../components/Stat.vue'),
        },
      },
      {
        path: 'admin',
        name: 'admin',
        meta: { title: 'Administration', requiresAdmin: true },
        components: {
          default: () => import('../pages/Admin-Page.vue'),
          sidebar: () => import('../components/Stat.vue'),
        },
      },
    ],
  },
]

export default routes
