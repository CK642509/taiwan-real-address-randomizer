<script setup lang="ts">
import type { AddressResult } from '../types/address'

const props = defineProps<{
  addresses: AddressResult[]
}>()

const emit = defineEmits<{
  (e: 'copy-all'): void
}>()
</script>

<template>
  <section class="card-surface p-4 md:p-5 lg:col-span-1">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-lg font-semibold text-white">結果清單</p>
        <p class="text-sm text-slate-400">固定高度，超出時可卷軸檢視。</p>
      </div>
      <button
        class="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!props.addresses.length"
        @click="emit('copy-all')"
      >
        複製全部地址
      </button>
    </div>

    <div class="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
      <div
        v-if="!props.addresses.length"
        class="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 px-4 py-5 text-center text-sm text-slate-400"
      >
        尚未產出資料，請設定條件後按下「立即產生」。
      </div>

      <article
        v-for="item in props.addresses"
        :key="item.id"
        class="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 transition hover:border-sky-500/50"
      >
        <p class="text-base font-semibold text-white">{{ item.address }}</p>
        <p class="text-xs text-slate-400">
          Lat {{ item.lat.toFixed(5) }} · Lng {{ item.lng.toFixed(5) }}
        </p>
      </article>
    </div>
  </section>
</template>
