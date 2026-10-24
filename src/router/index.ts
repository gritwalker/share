import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/lib/api'
import LoginView from '@/views/LoginView.vue'
import MarketView from '@/views/MarketView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true },
    },
    {
      path: '/',
      name: 'market',
      component: MarketView,
      meta: { auth: true },
    },
    {
      path: '/register-item',
      name: 'register-item',
      component: () => import('@/views/RegisterItemView.vue'),
      meta: { auth: true },
    },
    {
      path: '/mypage',
      name: 'mypage',
      component: () => import('@/views/MyPageView.vue'),
      meta: { auth: true },
    },
  ],
})

router.beforeEach((to) => {
  const loggedIn = !!getToken()
  if (to.meta.auth && !loggedIn) return { name: 'login' }
  if (to.meta.guest && loggedIn) return { name: 'market' }
  return true
})

export default router
