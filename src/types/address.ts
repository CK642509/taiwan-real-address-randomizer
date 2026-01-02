export type OverpassElement = {
  id: number
  type: 'node' | 'way'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export type OverpassResponse = {
  elements?: OverpassElement[]
}

export type AddressResult = {
  id: number
  address: string
  lat: number
  lng: number
  rawTags: Record<string, string>
}
