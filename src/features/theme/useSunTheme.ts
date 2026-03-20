/**
 * Automatically switches dark/light theme based on local sunrise/sunset.
 * Only activates if the user has NOT manually set a theme ('mapTheme' in localStorage).
 * Checks every 60 seconds and on GPS position update.
 */
import { useEffect, useRef } from 'react'
import { useThemeStore } from './store'

/** Returns sunrise and sunset as decimal hours in LOCAL time (not UTC). */
function sunTimes(lat: number, lng: number, date: Date): { rise: number; set: number } {
  const rad = Math.PI / 180
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000,
  )
  const declination =
    -23.45 * Math.cos(rad * (360 / 365) * (dayOfYear + 10))
  const hourAngle =
    Math.acos(
      (Math.sin(rad * -0.833) - Math.sin(rad * lat) * Math.sin(rad * declination)) /
      (Math.cos(rad * lat) * Math.cos(rad * declination)),
    ) / rad
  const solarNoon  = 12 - lng / 15
  return { rise: solarNoon - hourAngle / 15, set: solarNoon + hourAngle / 15 }
}

function isNight(lat: number, lng: number): boolean {
  const now = new Date()
  const h   = now.getHours() + now.getMinutes() / 60
  try {
    const { rise, set } = sunTimes(lat, lng, now)
    return h < rise || h > set
  } catch {
    return h < 6 || h > 20
  }
}

export function useSunTheme() {
  const setDark  = useThemeStore((s) => s.setDark)
  const posRef   = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    // Only auto-theme if user has not manually set a preference
    if (localStorage.getItem('mapTheme') !== null) return

    const apply = () => {
      if (!posRef.current) return
      const night = isNight(posRef.current.lat, posRef.current.lng)
      setDark(night)
    }

    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        apply()
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    )

    const interval = setInterval(apply, 60_000)
    return () => {
      navigator.geolocation.clearWatch(watchId)
      clearInterval(interval)
    }
  }, [setDark])
}
