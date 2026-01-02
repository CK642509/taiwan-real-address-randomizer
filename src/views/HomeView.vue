<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LatLngLiteral } from 'leaflet'
import MapPanel from '../components/MapPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'
import ResultList from '../components/ResultList.vue'
import type { AddressResult, OverpassElement, OverpassResponse } from '../types/address'

const radiusKm = ref(2)
const addressCount = ref(10)
const loading = ref(false)
const lastRequestAt = ref<number | null>(null)
const statusMessage = ref('點擊地圖設定中心點，然後按下「立即產生」。')
const statusState = ref<'idle' | 'success' | 'empty' | 'error'>('idle')
const randomAddresses = ref<AddressResult[]>([])
const center = ref<LatLngLiteral>({ lat: 25.033, lng: 121.5654 })

watch(radiusKm, (value) => {
  if (value < 1) radiusKm.value = 1
  if (value > 10) radiusKm.value = 10
})

watch(addressCount, (value) => {
  if (value < 1) addressCount.value = 1
  if (value > 50) addressCount.value = 50
})

const overpassEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

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
    const tmp = clone[i]!
    clone[i] = clone[j]!
    clone[j] = tmp
  }
  return clone
}

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
      return
    }

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

function handleCenterChange(position: LatLngLiteral) {
  center.value = position
  statusState.value = 'idle'
  statusMessage.value = '中心點已更新，請重新產生資料。'
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1.3fr_1.2fr_1.2fr]">
    <MapPanel
      :center="center"
      :radius-km="radiusKm"
      :loading="loading"
      :addresses="randomAddresses"
      @update:center="handleCenterChange"
    />

    <ControlPanel
      :radius-km="radiusKm"
      :address-count="addressCount"
      :status-message="statusMessage"
      :status-state="statusState"
      :loading="loading"
      @update:radius-km="(value) => (radiusKm = value)"
      @update:address-count="(value) => (addressCount = value)"
      @generate="generateAddresses"
    />

    <ResultList :addresses="randomAddresses" @copy-all="copyAll" />
  </div>
</template>
