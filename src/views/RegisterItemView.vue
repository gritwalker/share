<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { api } from '@/lib/api'
import { useSession } from '@/stores/session'

const router = useRouter()
const { showReward, updateCoins } = useSession()

const emojis = ['📦', '📚', '✏️', '🧸', '⚽', '🎨', '🧢', '🎒', '🧩', '🎮', '👟', '🎧']
const title = ref('')
const description = ref('')
const price = ref(10)
const tradeType = ref<'sale' | 'donate'>('sale')
const emoji = ref('📦')
const imageData = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2_000_000) {
    error.value = '사진이 너무 커요! 더 작은 사진으로 해봐요.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const max = 480
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      imageData.value = canvas.toDataURL('image/jpeg', 0.72)
    }
    img.src = String(reader.result)
  }
  reader.readAsDataURL(file)
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const data = await api.createItem({
      title: title.value,
      description: description.value,
      price: tradeType.value === 'donate' ? 0 : price.value,
      tradeType: tradeType.value,
      emoji: emoji.value,
      imageData: imageData.value,
    })
    updateCoins(data.ecoCoins, data.badges)
    showReward(data.reward)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '등록에 실패했어요'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppShell>
    <section class="soft-shadow rounded-[2rem] bg-white p-5">
      <h2 class="text-2xl font-black">물건 올리기 📦</h2>
      <p class="mt-1 text-sm font-bold text-ink/60">
        안 쓰는 물건을 친구에게 나눠주면 에코코인을 받아요!
      </p>

      <form class="mt-4 space-y-4" @submit.prevent="submit">
        <div>
          <p class="mb-2 text-sm font-extrabold">아이콘 고르기</p>
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="e in emojis"
              :key="e"
              type="button"
              class="rounded-2xl py-2 text-2xl"
              :class="emoji === e ? 'bg-sun soft-shadow' : 'bg-cream'"
              @click="emoji = e"
            >
              {{ e }}
            </button>
          </div>
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-extrabold">사진 (선택)</span>
          <input
            type="file"
            accept="image/*"
            class="w-full rounded-2xl border-2 border-dashed border-leaf/50 bg-cream px-3 py-3 text-sm font-bold"
            @change="onFile"
          />
          <img
            v-if="imageData"
            :src="imageData"
            alt="미리보기"
            class="mt-2 h-32 w-full rounded-2xl object-cover"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-extrabold">제목</span>
          <input
            v-model="title"
            required
            maxlength="40"
            class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-4 py-3 font-bold outline-none focus:border-carrot"
            placeholder="예: 안 쓰는 색연필"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-extrabold">설명</span>
          <textarea
            v-model="description"
            rows="3"
            maxlength="300"
            class="w-full resize-none rounded-2xl border-2 border-sun/80 bg-soft px-4 py-3 font-bold outline-none focus:border-carrot"
            placeholder="상태를 친구들에게 알려줘요!"
          />
        </label>

        <div>
          <p class="mb-2 text-sm font-extrabold">거래 방식</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-2xl py-3 text-sm font-extrabold"
              :class="tradeType === 'sale' ? 'bg-carrot text-white' : 'bg-cream text-ink/60'"
              @click="tradeType = 'sale'"
            >
              🤝 판매하기
            </button>
            <button
              type="button"
              class="rounded-2xl py-3 text-sm font-extrabold"
              :class="tradeType === 'donate' ? 'bg-sky text-white' : 'bg-cream text-ink/60'"
              @click="tradeType = 'donate'"
            >
              🎁 무료 나눔
            </button>
          </div>
          <p class="mt-2 text-xs font-bold text-ink/55">
            {{
              tradeType === 'donate'
                ? '나눔하면 에코코인 +30과 「나눔 왕」 뱃지! 🎁'
                : '등록하면 에코코인 +10! 🪙'
            }}
          </p>
        </div>

        <label v-if="tradeType === 'sale'" class="block">
          <span class="mb-1 block text-sm font-extrabold">가격 (에코코인)</span>
          <input
            v-model.number="price"
            type="number"
            min="1"
            max="9999"
            class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-4 py-3 font-bold outline-none focus:border-carrot"
          />
        </label>

        <p v-if="error" class="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-500">
          {{ error }}
        </p>

        <button
          type="submit"
          class="btn-3d w-full rounded-2xl bg-leaf-deep py-3.5 text-lg font-black text-white disabled:opacity-60"
          :disabled="busy"
        >
          {{ busy ? '올리는 중...' : '장터에 올리기! 🚀' }}
        </button>
      </form>
    </section>
  </AppShell>
</template>
