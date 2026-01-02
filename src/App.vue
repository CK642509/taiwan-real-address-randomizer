<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="px-4 py-8 md:py-12">
    <div class="mx-auto flex max-w-7xl flex-col gap-6">
      <header class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="tag border border-slate-700 bg-slate-800/80 text-slate-200">Leaflet + OSM</span>
          <span class="tag border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">Overpass API</span>
          <span class="tag border border-sky-500/40 bg-sky-500/10 text-sky-100">Vue 3 + TS</span>
        </div>
        <div class="flex flex-col gap-2">
          <h1 class="text-3xl font-bold text-white md:text-4xl">台灣真實地址隨機產生器</h1>
          <p class="text-slate-300">
            點擊地圖設定中心點，輸入半徑與數量，即可從 OpenStreetMap 的真實門牌資料中取得隨機地址並在地圖上標註。
          </p>
        </div>
      </header>

      <RouterView />
    </div>
  </main>
</template>
