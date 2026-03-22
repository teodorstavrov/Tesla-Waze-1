/**
 * followStore — module-level follow mode state.
 * Using a simple pub/sub instead of Zustand to avoid circular deps.
 * HeadingArrow writes; LocationButton reads and restores.
 */

type Listener = (following: boolean) => void
const _listeners: Listener[] = []
let _following = true
let _lastLat: number | null = null
let _lastLng: number | null = null

export const followStore = {
  isFollowing:   () => _following,
  getLastPos:    () => (_lastLat !== null && _lastLng !== null ? { lat: _lastLat, lng: _lastLng } : null),
  setLastPos:    (lat: number, lng: number) => { _lastLat = lat; _lastLng = lng },
  setFollowing:  (v: boolean) => {
    if (_following === v) return
    _following = v
    console.log(`[map] follow ${v ? 'restored by recenter' : 'disabled due to user pan'}`)
    _listeners.forEach((l) => l(v))
  },
  subscribe:     (fn: Listener) => {
    _listeners.push(fn)
    return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
  },
}
