<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import type { LatLngLiteral, Map as LeafletMap } from 'leaflet'
import type { AddressResult } from '../types/address'

const props = defineProps<{
  center: LatLngLiteral
  radiusKm: number
  loading: boolean
  addresses: AddressResult[]
}>()

const emit = defineEmits<{
  (e: 'update:center', value: LatLngLiteral): void
}>()

const mapRef = ref<HTMLDivElement | null>(null)
const map = ref<LeafletMap | null>(null)
const centerMarker = ref<L.Marker | null>(null)
const rangeCircle = ref<L.Circle | null>(null)
const addressMarkers = ref<L.Marker[]>([])

const centerIcon = L.divIcon({
  className: '',
  html: '<div class="marker-pin marker-center"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const addressIcon = L.divIcon({
  className: '',
  html: '<div class="marker-pin marker-address"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  map.value?.remove()
})

watch(
  () => props.radiusKm,
  (value) => {
    if (rangeCircle.value) {
      rangeCircle.value.setRadius(value * 1000)
    }
  },
)

watch(
  () => props.center,
  (value) => {
    updateCenterVisuals(value)
  },
  { deep: true },
)

watch(
  () => props.addresses,
  (addresses) => {
    paintAddressMarkers(addresses)
  },
  { deep: true },
)

function initMap() {
  if (!mapRef.value) return

  const instance = L.map(mapRef.value, {
    zoomControl: true,
    minZoom: 6,
    maxZoom: 18,
  }).setView(props.center, 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(instance)

  map.value = instance

  updateCenterVisuals(props.center)
  paintAddressMarkers(props.addresses)

  instance.on('click', (event) => {
    emit('update:center', event.latlng)
  })
}

function updateCenterVisuals(point: LatLngLiteral) {
  if (!map.value) return
  const targetMap = map.value as L.Map

  if (centerMarker.value) {
    centerMarker.value.setLatLng(point)
  } else {
    centerMarker.value = L.marker(point, { icon: centerIcon }).addTo(targetMap)
  }

  if (rangeCircle.value) {
    rangeCircle.value.setLatLng(point)
    rangeCircle.value.setRadius(props.radiusKm * 1000)
  } else {
    rangeCircle.value = L.circle(point, {
      radius: props.radiusKm * 1000,
      color: '#38bdf8',
      weight: 2,
      fillOpacity: 0.12,
      fillColor: '#38bdf8',
    }).addTo(targetMap)
  }

  targetMap.flyTo(point, targetMap.getZoom(), { duration: 0.4 })
}

function clearAddressMarkers() {
  addressMarkers.value.forEach((marker) => marker.remove())
  addressMarkers.value = []
}

function paintAddressMarkers(addresses: AddressResult[]) {
  if (!map.value) return
  const targetMap = map.value as L.Map

  clearAddressMarkers()

  addresses.forEach((item) => {
    const marker = L.marker({ lat: item.lat, lng: item.lng }, { icon: addressIcon })
    marker.bindPopup(`<strong>${item.address}</strong><br />${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`)
    marker.addTo(targetMap)
    addressMarkers.value.push(marker)
  })
}
</script>

<template>
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
        {{ `緯度 ${props.center.lat.toFixed(4)} · 經度 ${props.center.lng.toFixed(4)}` }}
      </div>
    </div>
    <div class="relative overflow-hidden rounded-xl">
      <div ref="mapRef" class="h-[520px] w-full" aria-label="Leaflet map"></div>
      <div v-if="props.loading" class="absolute inset-0 grid place-items-center bg-slate-900/70 backdrop-blur-sm">
        <div class="flex items-center gap-3 text-slate-200">
          <div class="loader"></div>
          <span>資料載入中...</span>
        </div>
      </div>
    </div>
  </section>
</template>
