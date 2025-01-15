import { nextTick } from 'vue'
import { defineRouter } from '#q-app/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'
import { useUserStore } from 'src/stores/user'
import routes from './routes'
import type { RouteLocationNormalized } from 'vue-router'
import type { userType } from '../components/models'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */
export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  // Leave this as is and make changes in quasar.conf.js instead!
  // quasar.conf.js -> build -> vueRouterMode
  // quasar.conf.js -> build -> publicPath
  const history = createHistory(process.env.VUE_ROUTER_BASE)

  async function beforeEach(to: RouteLocationNormalized) {
    const auth = useUserStore()
    const user = auth.user as userType | null

    if (to.meta.requiresAuth && !(user && user.isAuthorized)) {
      return { name: '401', replace: true }
    } else if (to.meta.requiresAdmin && !(user && user.isAdmin)) {
      return { name: '401', replace: true }
    }
  }

  async function afterEach(to: RouteLocationNormalized) {
    // Use next tick to handle router history correctly
    nextTick(() => {
      document.title = to.meta.title as string
    })
  }

  const router = createRouter({
    history,
    routes,
  })

  router.beforeEach(beforeEach)
  router.afterEach(afterEach)

  return router
})
