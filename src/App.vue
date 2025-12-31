<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Circle,
  Map as LeafletMap,
  Marker,
  divIcon,
  map as createMap,
  tileLayer,
  type LatLngLiteral,
} from 'leaflet'

type OverpassElement = {
  id: number
  type: 'node' | 'way'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements?: OverpassElement[]
}

type AddressResult = {
  id: number
  address: string
  lat: number
  lng: number
  rawTags: Record<string, string>
}

const mapRef = ref<HTMLDivElement | null>(null)
const map = ref<LeafletMap | null>(null)
const centerMarker = ref<Marker | null>(null)
const rangeCircle = ref<Circle | null>(null)
const addressMarkers = ref<Marker[]>([])

const radiusKm = ref(2)
const addressCount = ref(10)
const loading = ref(false)
const lastRequestAt = ref<number | null>(null)
const statusMessage = ref('點擊地圖設定中心點，然後按下「立即產生」。')
const statusState = ref<'idle' | 'success' | 'empty' | 'error'>('idle')
const randomAddresses = ref<AddressResult[]>([])
const center = ref<LatLngLiteral>({ lat: 25.033, lng: 121.5654 })

const centerIcon = divIcon({
  className: '',
  html: '<div class="marker-pin marker-center"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const addressIcon = divIcon({
  className: '',
  html: '<div class="marker-pin marker-address"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

watch(radiusKm, (value) => {
  if (rangeCircle.value) {
    rangeCircle.value.setRadius(value * 1000)
  }
})

watch(addressCount, (value) => {
  if (value < 1) addressCount.value = 1
  if (value > 50) addressCount.value = 50
})

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  map.value?.remove()
})

function initMap() {
  if (!mapRef.value) return

  const instance = createMap(mapRef.value, {
    zoomControl: true,
    minZoom: 6,
    maxZoom: 18,
  }).setView(center.value, 13)

  tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(instance)

  map.value = instance

  updateCenterVisuals(center.value)

  instance.on('click', (event) => {
    updateCenterVisuals(event.latlng)
    statusState.value = 'idle'
    statusMessage.value = '中心點已更新，請重新產生資料。'
  })
}

function updateCenterVisuals(point: LatLngLiteral) {
  const mapInstance = map.value
  if (!mapInstance) return

  center.value = point

  if (centerMarker.value) {
    centerMarker.value.setLatLng(point)
  } else {
    centerMarker.value = new Marker(point, { icon: centerIcon }).addTo(mapInstance)
  }

  if (rangeCircle.value) {
    rangeCircle.value.setLatLng(point)
    rangeCircle.value.setRadius(radiusKm.value * 1000)
  } else {
    rangeCircle.value = new Circle(point, {
      radius: radiusKm.value * 1000,
      color: '#38bdf8',
      weight: 2,
      fillOpacity: 0.12,
      fillColor: '#38bdf8',
    }).addTo(mapInstance)
  }

  mapInstance.flyTo(point, mapInstance.getZoom(), { duration: 0.4 })
}

function clearAddressMarkers() {
  addressMarkers.value.forEach((marker) => marker.remove())
  addressMarkers.value = []
}

function paintAddressMarkers(addresses: AddressResult[]) {
  const mapInstance = map.value
  if (!mapInstance) return

  clearAddressMarkers()

  addresses.forEach((item) => {
    const marker = new Marker({ lat: item.lat, lng: item.lng }, { icon: addressIcon })
    marker.bindPopup(`<strong>${item.address}</strong><br />${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`)
    marker.addTo(mapInstance)
    addressMarkers.value.push(marker)
  })
}

function formatTaiwanAddress(tags: Record<string, string>) {
  const region = [
    tags['addr:province'] || tags['addr:state'] || '',
    tags['addr:city'] || tags['addr:county'] || '',
    tags['addr:district'] || tags['addr:suburb'] || '',
  ]
    .filter(Boolean)
    .join('')

  const street = tags['addr:street'] || tags['addr:place'] || tags['addr:neighbourhood'] || ''
  const housenumber = tags['addr:housenumber'] || ''

  const main = [street, housenumber].filter(Boolean).join(' ')

  return [region, main].filter(Boolean).join(' ')
}

function toCoordinate(element: OverpassElement) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lng: element.lon }
  }
  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
    return { lat: element.center.lat, lng: element.center.lon }
  }
  return null
}

function shuffle<T>(input: T[]) {
  const clone = [...input]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

const overpassEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timer)
    return response
  } catch (error) {
    clearTimeout(timer)
    throw error
  }
}

async function fetchAddresses(): Promise<AddressResult[]> {
  const radiusMeters = Math.round(radiusKm.value * 1000)
  const query = `[out:json][timeout:30];
(
  node["addr:housenumber"](around:${radiusMeters},${center.value.lat},${center.value.lng});
  way["addr:housenumber"](around:${radiusMeters},${center.value.lat},${center.value.lng});
);
out center;`

  let lastError: unknown = null

  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'User-Agent': 'Taiwan-Real-Address-Randomizer/1.0 (https://github.com/ck642509/taiwan-real-address-randomizer)',
          },
          body: query,
        },
        20000,
      )

      if (!response.ok) {
        throw new Error(`Overpass error ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Unexpected response type: ${contentType} ${text.slice(0, 180)}`)
      }

      const data = (await response.json()) as OverpassResponse
      const elements = data.elements || []

      const formatted = elements
        .filter((item) => item.tags?.['addr:street'] && item.tags?.['addr:housenumber'])
        .map((item) => {
          const coords = toCoordinate(item)
          if (!coords) return null

          const addressText = formatTaiwanAddress(item.tags || {})
          return addressText
            ? {
                id: item.id,
                address: addressText,
                lat: coords.lat,
                lng: coords.lng,
                rawTags: item.tags || {},
              }
            : null
        })
        .filter(Boolean) as AddressResult[]

      return formatted
    } catch (error) {
      lastError = error
      console.warn(`Overpass endpoint failed: ${endpoint}`, error)
    }
  }

  throw lastError || new Error('All Overpass endpoints failed')
}

async function generateAddresses() {
  const now = Date.now()
  const cooldownMs = 3000
  if (lastRequestAt.value && now - lastRequestAt.value < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - lastRequestAt.value)) / 1000)
    statusState.value = 'idle'
    statusMessage.value = `請稍候 ${waitSec} 秒後再嘗試，避免頻繁請求。`
    return
  }

  lastRequestAt.value = now
  loading.value = true
  statusState.value = 'idle'
  statusMessage.value = '資料請求中，約需數秒...'

  try {
    const candidates = await fetchAddresses()
    const shuffled = shuffle(candidates)
    const selection = shuffled.slice(0, addressCount.value)

    randomAddresses.value = selection

    if (!selection.length) {
      statusState.value = 'empty'
      statusMessage.value = '該區域無資料，請調整半徑或位置。'
      clearAddressMarkers()
      return
    }

    paintAddressMarkers(selection)
    statusState.value = 'success'
    statusMessage.value = `成功產生 ${selection.length} 筆地址。`
  } catch (error) {
    console.error(error)
    statusState.value = 'error'
    statusMessage.value = '取得資料時發生錯誤，請稍後再試。'
  } finally {
    loading.value = false
  }
}

async function copyAll() {
  if (!randomAddresses.value.length) return

  try {
    const text = randomAddresses.value.map((item) => item.address).join('\n')
    await navigator.clipboard.writeText(text)
    statusState.value = 'success'
    statusMessage.value = '已複製全部地址到剪貼簿。'
  } catch (error) {
    console.error(error)
    statusState.value = 'error'
    statusMessage.value = '複製失敗，請檢查瀏覽器權限。'
  }
}
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

      <div class="grid gap-6 lg:grid-cols-[1.3fr_1.2fr_1.2fr]">
        <section class="card-surface map-shadow p-4 md:p-5 lg:col-span-1">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span class="inline-block h-2.5 w-2.5 rounded-full bg-sky-400"></span>
                <span>中心點</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                <span>隨機地址標記</span>
              </div>
            </div>
            <div class="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {{ `緯度 ${center.lat.toFixed(4)} · 經度 ${center.lng.toFixed(4)}` }}
            </div>
          </div>
          <div class="relative overflow-hidden rounded-xl">
            <div ref="mapRef" class="h-[520px] w-full" aria-label="Leaflet map"></div>
            <div v-if="loading" class="absolute inset-0 grid place-items-center bg-slate-900/70 backdrop-blur-sm">
              <div class="flex items-center gap-3 text-slate-200">
                <div class="loader"></div>
                <span>資料載入中...</span>
              </div>
            </div>
          </div>
        </section>
        <section class="flex flex-col gap-4 lg:col-span-1">
          <div class="card-surface p-4 md:p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-white">條件設定</p>
                <p class="text-sm text-slate-400">調整半徑與數量，再按下立即產生。</p>
              </div>
              <span
                class="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100"
              >Live</span>
            </div>

            <div class="mt-6 space-y-5">
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm text-slate-300">
                  <span>半徑 (公里)</span>
                  <span class="font-semibold text-white">{{ radiusKm.toFixed(1) }} km</span>
                </div>
                <input
                  v-model.number="radiusKm"
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  class="w-full accent-sky-400"
                />
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm text-slate-300">
                  <span>產出數量</span>
                  <span class="font-semibold text-white">{{ addressCount }}</span>
                </div>
                <input
                  v-model.number="addressCount"
                  type="number"
                  min="1"
                  max="50"
                  class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
                <p class="text-xs text-slate-400">允許 1 ~ 50 筆，預設 10 筆。</p>
              </div>

              <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div class="space-y-1 text-sm">
                  <p class="font-semibold text-white">狀態</p>
                  <p class="text-slate-300">{{ statusMessage }}</p>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="{
                    'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30': statusState === 'success',
                    'bg-amber-500/15 text-amber-200 border border-amber-500/30': statusState === 'empty',
                    'bg-rose-500/15 text-rose-200 border border-rose-500/30': statusState === 'error',
                    'bg-slate-700/60 text-slate-200 border border-slate-600/50': statusState === 'idle',
                  }"
                >
                  {{ statusState === 'idle' ? '等待中' : statusState === 'success' ? '成功' : statusState === 'empty' ? '無資料' : '錯誤' }}
                </span>
              </div>

              <button
                class="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="loading"
                @click="generateAddresses"
              >
                {{ loading ? '請求中...' : '立即產生' }}
              </button>
            </div>
          </div>
        </section>

        <section class="card-surface p-4 md:p-5 lg:col-span-1">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-lg font-semibold text-white">結果清單</p>
              <p class="text-sm text-slate-400">固定高度，超出時可卷軸檢視。</p>
            </div>
            <button
              class="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!randomAddresses.length"
              @click="copyAll"
            >
              複製全部地址
            </button>
          </div>

          <div class="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
            <div
              v-if="!randomAddresses.length"
              class="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 px-4 py-5 text-center text-sm text-slate-400"
            >
              尚未產出資料，請設定條件後按下「立即產生」。
            </div>

            <article
              v-for="item in randomAddresses"
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
      </div>
    </div>
  </main>
</template>
