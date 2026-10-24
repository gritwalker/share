<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { api, type Item } from '@/lib/api'
import { useSession } from '@/stores/session'

const router = useRouter()
const { user, logout } = useSession()

const history = ref<Array<{ id: number; amount: number; reason: string; createdAt: string }>>([])
const myItems = ref<Item[]>([])
const donatedCount = ref(0)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [h, m] = await Promise.all([api.history(), api.myItems()])
    history.value = h.history
    myItems.value = m.items
    donatedCount.value = m.donatedCount
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function removeItem(item: Item) {
  if (!confirm(`「${item.title}」을(를) 삭제할까요?`)) return
  await api.deleteItem(item.id)
  await load()
}

async function doLogout() {
  await logout()
  router.replace('/login')
}
</script>

<template>
  <AppShell>
    <section class="soft-shadow mb-4 rounded-[2rem] bg-white p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-extrabold text-ink/55">마이페이지</p>
          <h2 class="text-2xl font-black">{{ user?.username }} 🙋</h2>
          <p class="mt-1 text-sm font-bold text-ink/60">
            {{ user?.schoolName }} · {{ user?.grade }}학년 {{ user?.classNum }}반
          </p>
        </div>
        <button
          class="rounded-2xl bg-cream px-3 py-2 text-xs font-extrabold text-ink/60"
          @click="doLogout"
        >
          로그아웃
        </button>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-3xl bg-sun/60 p-4 text-center">
          <p class="text-xs font-extrabold text-ink/55">내 에코코인</p>
          <p class="mt-1 text-2xl font-black">{{ user?.ecoCoins }} 🪙</p>
        </div>
        <div class="rounded-3xl bg-sky/20 p-4 text-center">
          <p class="text-xs font-extrabold text-ink/55">기증한 물건</p>
          <p class="mt-1 text-2xl font-black">{{ donatedCount }} 🎁</p>
        </div>
      </div>

      <div v-if="user?.badges?.length" class="mt-4">
        <p class="mb-2 text-sm font-extrabold">내 뱃지</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="badge in user.badges"
            :key="badge"
            class="rounded-full bg-leaf/25 px-3 py-1 text-sm font-extrabold text-leaf-deep"
          >
            🏅 {{ badge }}
          </span>
        </div>
      </div>
    </section>

    <section class="soft-shadow mb-4 rounded-[2rem] bg-white p-5">
      <h3 class="text-lg font-black">에코코인 내역 🪙</h3>
      <p v-if="loading" class="mt-3 text-sm font-bold text-ink/45">불러오는 중...</p>
      <ul v-else class="mt-3 space-y-2">
        <li
          v-for="row in history"
          :key="row.id"
          class="flex items-center justify-between gap-2 rounded-2xl bg-cream px-3 py-2"
        >
          <span class="text-sm font-bold leading-snug">{{ row.reason }}</span>
          <span
            class="shrink-0 text-sm font-black"
            :class="row.amount >= 0 ? 'text-leaf-deep' : 'text-carrot'"
          >
            {{ row.amount >= 0 ? '+' : '' }}{{ row.amount }}
          </span>
        </li>
        <li v-if="!history.length" class="text-sm font-bold text-ink/45">아직 내역이 없어요.</li>
      </ul>
    </section>

    <section class="soft-shadow rounded-[2rem] bg-white p-5">
      <h3 class="text-lg font-black">내가 올린 물건 📦</h3>
      <ul class="mt-3 space-y-2">
        <li
          v-for="item in myItems"
          :key="item.id"
          class="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2"
        >
          <span class="text-2xl">{{ item.emoji }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-extrabold">{{ item.title }}</p>
            <p class="text-xs font-bold text-ink/50">
              {{ item.tradeType === 'donate' ? '나눔' : item.price + '코인' }} ·
              {{
                item.status === 'available'
                  ? '판매중'
                  : item.status === 'sold'
                    ? '판매완료'
                    : '나눔완료'
              }}
            </p>
          </div>
          <button
            v-if="item.status === 'available'"
            class="rounded-xl bg-white px-2 py-1 text-xs font-extrabold text-red-400"
            @click="removeItem(item)"
          >
            삭제
          </button>
        </li>
        <li v-if="!myItems.length" class="text-sm font-bold text-ink/45">올린 물건이 아직 없어요.</li>
      </ul>
    </section>
  </AppShell>
</template>
