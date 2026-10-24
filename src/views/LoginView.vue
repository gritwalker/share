<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken, type School } from '@/lib/api'
import { useSession } from '@/stores/session'

const router = useRouter()
const { setUser, showReward } = useSession()

const mode = ref<'login' | 'register'>('register')
const username = ref('')
const password = ref('')
const grade = ref(3)
const classNum = ref(1)
const schoolQuery = ref('')
const schools = ref<School[]>([])
const selectedSchool = ref<School | null>(null)
const schoolSource = ref('sample')
const error = ref('')
const busy = ref(false)
const showList = ref(false)

let searchTimer: number | undefined

async function searchSchools(q: string) {
  try {
    const data = await api.schools(q)
    schools.value = data.schools
    schoolSource.value = data.source
  } catch {
    schools.value = []
  }
}

onMounted(() => searchSchools(''))

watch(schoolQuery, (q) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => searchSchools(q), 280)
})

function pickSchool(school: School) {
  selectedSchool.value = school
  schoolQuery.value = school.schoolName
  showList.value = false
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'register') {
      if (!selectedSchool.value) {
        error.value = '학교를 검색해서 골라주세요!'
        return
      }
      const data = await api.register({
        username: username.value,
        password: password.value,
        schoolCode: selectedSchool.value.schoolCode,
        schoolName: selectedSchool.value.schoolName,
        grade: grade.value,
        classNum: classNum.value,
      })
      setToken(data.token)
      setUser(data.user)
      showReward(data.reward)
    } else {
      const data = await api.login({
        username: username.value,
        password: password.value,
      })
      setToken(data.token)
      setUser(data.user)
    }
    router.replace('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '다시 시도해 주세요!'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 py-8">
    <div class="mb-6 text-center">
      <div class="animate-float mb-2 text-6xl">♻️</div>
      <h1 class="text-3xl font-black text-ink">학교 안 아바다</h1>
      <p class="mt-2 text-base font-bold text-ink/70">
        친구에게 물건을 주고<br />에코코인을 모아봐요!
      </p>
    </div>

    <div class="soft-shadow rounded-[2rem] bg-white/95 p-5">
      <div class="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-1">
        <button
          class="rounded-xl py-2 text-sm font-extrabold"
          :class="mode === 'register' ? 'bg-carrot text-white' : 'text-ink/60'"
          @click="mode = 'register'"
        >
          회원가입 ✨
        </button>
        <button
          class="rounded-xl py-2 text-sm font-extrabold"
          :class="mode === 'login' ? 'bg-sky text-white' : 'text-ink/60'"
          @click="mode = 'login'"
        >
          로그인 👋
        </button>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <template v-if="mode === 'register'">
          <label class="block">
            <span class="mb-1 block text-sm font-extrabold">🏫 우리 학교 찾기</span>
            <input
              v-model="schoolQuery"
              class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-4 py-3 font-bold outline-none focus:border-carrot"
              placeholder="학교 이름을 적어보세요"
              @focus="showList = true"
            />
          </label>
          <div
            v-if="showList && schools.length"
            class="max-h-40 overflow-auto rounded-2xl border-2 border-leaf/40 bg-white"
          >
            <button
              v-for="school in schools"
              :key="school.schoolCode"
              type="button"
              class="block w-full border-b border-cream px-3 py-2 text-left last:border-0 hover:bg-cream"
              @click="pickSchool(school)"
            >
              <p class="font-extrabold">{{ school.schoolName }}</p>
              <p class="text-xs font-bold text-ink/55">{{ school.region }} · {{ school.address }}</p>
            </button>
          </div>
          <p v-if="selectedSchool" class="text-xs font-bold text-leaf-deep">
            ✅ {{ selectedSchool.schoolName }} 선택됨
            <span class="text-ink/45">({{ schoolSource === 'neis' ? '나이스' : '샘플' }})</span>
          </p>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1 block text-sm font-extrabold">학년</span>
              <select
                v-model.number="grade"
                class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-3 py-3 font-bold"
              >
                <option v-for="g in 6" :key="g" :value="g">{{ g }}학년</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-extrabold">반</span>
              <select
                v-model.number="classNum"
                class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-3 py-3 font-bold"
              >
                <option v-for="c in 12" :key="c" :value="c">{{ c }}반</option>
              </select>
            </label>
          </div>
        </template>

        <label class="block">
          <span class="mb-1 block text-sm font-extrabold">아이디</span>
          <input
            v-model="username"
            class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-4 py-3 font-bold outline-none focus:border-carrot"
            placeholder="예: 초록이"
            required
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-extrabold">비밀번호</span>
          <input
            v-model="password"
            type="password"
            class="w-full rounded-2xl border-2 border-sun/80 bg-soft px-4 py-3 font-bold outline-none focus:border-carrot"
            placeholder="4글자 이상"
            required
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
          {{ busy ? '잠깐만요...' : mode === 'register' ? '시작하기! 🚀' : '들어가기! 🔑' }}
        </button>
      </form>
    </div>
  </div>
</template>
