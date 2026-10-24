<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { Reward } from '@/lib/api'

const props = defineProps<{ reward: Reward }>()
const emit = defineEmits<{ close: [] }>()
const bits = ref(
  Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    emoji: ['🪙', '⭐', '🎉', '💚', '✨'][i % 5],
  })),
)

let timer = 0
onMounted(() => {
  timer = window.setTimeout(() => emit('close'), 2800)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5"
    @click="emit('close')"
  >
    <div
      class="animate-pop relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white px-6 py-8 text-center soft-shadow"
      @click.stop
    >
      <div
        v-for="bit in bits"
        :key="bit.id"
        class="pointer-events-none absolute text-xl"
        :style="{
          left: bit.left + '%',
          top: '8%',
          animation: `confetti 1.4s ease-out ${bit.delay}s forwards`,
        }"
      >
        {{ bit.emoji }}
      </div>
      <div class="animate-coin mx-auto mb-3 text-6xl">🪙</div>
      <p class="text-2xl font-black text-carrot">에코코인 +{{ props.reward.amount }}</p>
      <p class="mt-3 text-base font-bold leading-relaxed text-ink">{{ props.reward.message }}</p>
      <button
        class="btn-3d mt-6 w-full rounded-2xl bg-leaf px-4 py-3 text-lg font-extrabold text-white"
        @click="emit('close')"
      >
        좋아요! 👍
      </button>
    </div>
  </div>
</template>
