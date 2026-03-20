import { env } from '@/lib/env'

export interface StationSearchResult {
  id:         string
  name:       string
  operator:   string
  city:       string
  country:    string
  lat:        number
  lng:        number
  totalPorts: number
  isTesla:    boolean
}

let _abort: AbortController | null = null

export async function searchStations(
  q:    string,
  near?: { lat: number; lng: number },
): Promise<StationSearchResult[]> {
  _abort?.abort()
  _abort = new AbortController()

  const params = new URLSearchParams({ q })
  if (near) {
    params.set('lat', String(near.lat))
    params.set('lng', String(near.lng))
  }

  const url = `${env.apiBase}/api/ev/search?${params}`
  const res = await fetch(url, { signal: _abort.signal })
  if (!res.ok) throw new Error(`EV search ${res.status}`)
  const data = await res.json() as { results: StationSearchResult[] }
  return data.results
}
