<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSession } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const { user } = useSession()

const tabs = [
  { to: '/', label: '장터', emoji: '🛒' },
  { to: '/register-item', label: '올리기', emoji: '➕' },
  { to: '/mypage', label: '나', emoji: '🙋' },
]

const active = computed(() => route.path)
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-28 pt-4">
    <header class="mb-4 flex items-center justify-between gap-3">
      <div>
        <p class="animate-float text-sm font-extrabold text-leaf-deep">🌱 학교 안 아바다</p>
        <h1 class="text-xl font-black tracking-tight">
          {{ user ? `${user.grade}학년 ${user.classNum}반 ${user.username}` : '환영해요!' }}
        </h1>
      </div>
      <button
        v-if="user"
        class="soft-shadow flex items-center gap-1 rounded-full bg-sun px-3 py-2 text-base font-black"
        @click="router.push('/mypage')"
      >
        <span class="text-lg">🪙</span>
        <span>{{ user.ecoCoins }}</span>
      </button>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <nav
      class="fixed bottom-4 left-1/2 z-40 flex w-[min(100%-2rem,398px)] -translate-x-1/2 items-center justify-around rounded-[1.75rem] bg-white/95 px-2 py-2 soft-shadow backdrop-blur"
    >
      <button
        v-for="tab in tabs"
        :key="tab.to"
        class="flex min-w-[88px] flex-col items-center rounded-2xl px-3 py-2 text-sm font-extrabold transition"
        :class="
          active === tab.to
            ? 'bg-leaf/25 text-leaf-deep'
            : 'text-ink/60 hover:bg-cream'
        "
        @click="router.push(tab.to)"
      >
        <span class="text-xl">{{ tab.emoji }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>
