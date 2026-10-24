<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppShell from '@/components/AppShell.vue'
import { api, type Item } from '@/lib/api'
import { useSession } from '@/stores/session'

const { user, showReward, updateCoins } = useSession()
const tab = ref<'all' | 'donate'>('all')
const items = ref<Item[]>([])
const loading = ref(true)
const error = ref('')
const actingId = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.items(tab.value)
    items.value = data.items
  } catch (e) {
    error.value = e instanceof Error ? e.message : '불러오기 실패'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(tab, load)

async function buy(item: Item) {
  if (!confirm(`「${item.title}」을(를) ${item.price}코인에 살까요?`)) return
  actingId.value = item.id
  try {
    const data = await api.buyItem(item.id)
    updateCoins(data.ecoCoins)
    showReward(data.reward)
    await load()
  } catch (e) {
    alert(e instanceof Error ? e.message : '실패했어요')
  } finally {
    actingId.value = null
  }
}

async function claim(item: Item) {
  if (!confirm(`「${item.title}」을(를) 나눔 받을까요? 🎁`)) return
  actingId.value = item.id
  try {
    const data = await api.claimItem(item.id)
    updateCoins(data.ecoCoins)
    showReward(data.reward)
    await load()
  } catch (e) {
    alert(e instanceof Error ? e.message : '실패했어요')
  } finally {
    actingId.value = null
  }
}
</script>

<template>
  <AppShell>
    <section class="soft-shadow mb-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun via-white to-leaf/40 p-4">
      <p class="text-sm font-extrabold text-ink/70">내 에코코인</p>
      <p class="mt-1 text-3xl font-black">
        {{ user?.ecoCoins ?? 0 }}
        <span class="text-2xl">🪙</span>
      </p>
      <p class="mt-2 text-sm font-bold text-ink/65">
        {{ user?.schoolName }} 친구들과 물건을 나눠봐요!
      </p>
    </section>

    <div class="mb-4 grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/80 p-1 soft-shadow">
      <button
        class="rounded-2xl py-3 text-sm font-extrabold"
        :class="tab === 'all' ? 'bg-carrot text-white' : 'text-ink/55'"
        @click="tab = 'all'"
      >
        전체 물건 보기 🛒
      </button>
      <button
        class="rounded-2xl py-3 text-sm font-extrabold"
        :class="tab === 'donate' ? 'bg-sky text-white' : 'text-ink/55'"
        @click="tab = 'donate'"
      >
        무료 나눔 🎁
      </button>
    </div>

    <p v-if="loading" class="py-10 text-center font-bold text-ink/50">불러오는 중...</p>
    <p v-else-if="error" class="py-6 text-center font-bold text-red-500">{{ error }}</p>
    <p v-else-if="!items.length" class="py-10 text-center font-bold text-ink/50">
      아직 물건이 없어요.<br />첫 번째로 올려볼까요? ✨
    </p>

    <div v-else class="space-y-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="soft-shadow overflow-hidden rounded-[1.75rem] bg-white"
      >
        <div class="flex gap-3 p-3">
          <div
            class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-cream text-5xl"
          >
            <img
              v-if="item.imageData"
              :src="item.imageData"
              :alt="item.title"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ item.emoji }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-extrabold"
                :class="
                  item.tradeType === 'donate'
                    ? 'bg-sky/20 text-sky'
                    : 'bg-carrot/15 text-carrot'
                "
              >
                {{ item.tradeType === 'donate' ? '🎁 나눔' : '🤝 판매' }}
              </span>
            </div>
            <h2 class="truncate text-lg font-black">{{ item.title }}</h2>
            <p class="mt-0.5 line-clamp-2 text-sm font-bold text-ink/60">{{ item.description }}</p>
            <p class="mt-1 text-xs font-bold text-ink/45">
              {{ item.sellerGrade }}학년 {{ item.sellerClass }}반 · {{ item.sellerName }}
            </p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-cream px-3 py-2.5">
          <p class="text-lg font-black">
            <template v-if="item.tradeType === 'donate'">무료 🎁</template>
            <template v-else>{{ item.price }} 🪙</template>
          </p>
          <button
            v-if="item.sellerId !== user?.id"
            class="btn-3d rounded-2xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
            :class="item.tradeType === 'donate' ? 'bg-sky' : 'bg-carrot'"
            :disabled="actingId === item.id"
            @click="item.tradeType === 'donate' ? claim(item) : buy(item)"
          >
            {{
              actingId === item.id
                ? '잠깐...'
                : item.tradeType === 'donate'
                  ? '나눔 받기'
                  : '구매하기'
            }}
          </button>
          <span v-else class="text-sm font-extrabold text-ink/40">내 물건</span>
        </div>
      </article>
    </div>
  </AppShell>
</template>
