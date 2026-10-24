<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import RewardPopup from '@/components/RewardPopup.vue'
import { useSession } from '@/stores/session'

const { bootstrap, rewardPopup, clearReward, loading } = useSession()

onMounted(() => {
  void bootstrap()
})
</script>

<template>
  <div v-if="loading" class="flex min-h-dvh items-center justify-center">
    <div class="animate-pop text-center">
      <div class="animate-coin text-5xl">🪙</div>
      <p class="mt-3 text-lg font-extrabold">학교 안 아바다 준비 중...</p>
    </div>
  </div>
  <RouterView v-else />
  <RewardPopup v-if="rewardPopup" :reward="rewardPopup" @close="clearReward" />
</template>
