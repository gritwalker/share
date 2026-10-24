import { computed, ref } from 'vue'
import { api, getToken, setToken, type Reward, type User } from '@/lib/api'

const user = ref<User | null>(null)
const loading = ref(true)
const rewardPopup = ref<Reward | null>(null)

export function useSession() {
  const isLoggedIn = computed(() => !!user.value)

  async function bootstrap() {
    loading.value = true
    try {
      if (!getToken()) {
        user.value = null
        return
      }
      const data = await api.me()
      user.value = data.user
    } catch {
      setToken(null)
      user.value = null
    } finally {
      loading.value = false
    }
  }

  function setUser(next: User | null) {
    user.value = next
  }

  function showReward(reward: Reward) {
    rewardPopup.value = reward
  }

  function clearReward() {
    rewardPopup.value = null
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    setToken(null)
    user.value = null
  }

  function updateCoins(ecoCoins: number, badges?: string[]) {
    if (!user.value) return
    user.value = {
      ...user.value,
      ecoCoins,
      badges: badges ?? user.value.badges,
    }
  }

  return {
    user,
    loading,
    isLoggedIn,
    rewardPopup,
    bootstrap,
    setUser,
    showReward,
    clearReward,
    logout,
    updateCoins,
  }
}
