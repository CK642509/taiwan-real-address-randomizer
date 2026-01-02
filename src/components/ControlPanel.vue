<script setup lang="ts">
const props = defineProps<{
  radiusKm: number
  addressCount: number
  statusMessage: string
  statusState: 'idle' | 'success' | 'empty' | 'error'
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:radius-km', value: number): void
  (e: 'update:address-count', value: number): void
  (e: 'generate'): void
}>()

function onRadiusInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:radius-km', value)
}

function onAddressCountInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:address-count', value)
}
</script>

<template>
  <section class="flex flex-col gap-4 lg:col-span-1">
    <div class="card-surface p-4 md:p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-white">條件設定</p>
          <p class="text-sm text-slate-400">調整半徑與數量，再按下立即產生。</p>
        </div>
        <span class="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
          Live
        </span>
      </div>

      <div class="mt-6 space-y-5">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm text-slate-300">
            <span>半徑 (公里)</span>
            <span class="font-semibold text-white">{{ props.radiusKm.toFixed(1) }} km</span>
          </div>
          <input
            :value="props.radiusKm"
            type="range"
            min="1"
            max="10"
            step="0.5"
            class="w-full accent-sky-400"
            @input="onRadiusInput"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm text-slate-300">
            <span>產出數量</span>
            <span class="font-semibold text-white">{{ props.addressCount }}</span>
          </div>
          <input
            :value="props.addressCount"
            type="number"
            min="1"
            max="50"
            class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
            @input="onAddressCountInput"
          />
          <p class="text-xs text-slate-400">允許 1 ~ 50 筆，預設 10 筆。</p>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div class="space-y-1 text-sm">
            <p class="font-semibold text-white">狀態</p>
            <p class="text-slate-300">{{ props.statusMessage }}</p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold min-w-[74px] text-center whitespace-nowrap"
            :class="{
              'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30': props.statusState === 'success',
              'bg-amber-500/15 text-amber-200 border border-amber-500/30': props.statusState === 'empty',
              'bg-rose-500/15 text-rose-200 border border-rose-500/30': props.statusState === 'error',
              'bg-slate-700/60 text-slate-200 border border-slate-600/50': props.statusState === 'idle',
            }"
          >
            {{ props.statusState === 'idle' ? '等待中' : props.statusState === 'success' ? '成功' : props.statusState === 'empty' ? '無資料' : '錯誤' }}
          </span>
        </div>

        <button
          class="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.loading"
          @click="emit('generate')"
        >
          {{ props.loading ? '請求中...' : '立即產生' }}
        </button>
      </div>
    </div>
  </section>
</template>
