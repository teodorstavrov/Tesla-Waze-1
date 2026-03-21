/**
 * AdminPanel — visible only when URL contains ?admin
 * Flow: enter ADMIN_TOKEN password → backend verify → admin map-click mode
 * In admin mode: click anywhere on map → choose signal type → saved to DB
 */
import { useState, useEffect, useCallback } from 'react'
import type { Map as LMap, LeafletMouseEvent } from 'leaflet'
import type { EventType } from '@/features/events/types'

interface Props { map: LMap | null }

const SIGNAL_TYPES: Array<{ type: EventType; label: string; emoji: string; colour: string }> = [
  { type: 'police',   label: 'Полиция',    emoji: '🚔', colour: '#3d9df3' },
  { type: 'camera',   label: 'Камера',     emoji: '📷', colour: '#8e44ad' },
  { type: 'accident', label: 'Катастрофа', emoji: '💥', colour: '#e31937' },
  { type: 'danger',   label: 'Опасност',   emoji: '⚠️', colour: '#f5a623' },
]

const IS_ADMIN_URL = typeof window !== 'undefined' && window.location.search.includes('admin')

export function AdminPanel({ map }: Props) {
  const [token,   setToken]   = useState<string | null>(() => sessionStorage.getItem('admin_token'))
  const [pass,    setPass]    = useState('')
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(false)
  const [picker,  setPicker]  = useState<{ lat: number; lng: number; x: number; y: number } | null>(null)

  if (!IS_ADMIN_URL) return null

  const isReady = !!token

  const login = useCallback(async () => {
    if (!pass.trim()) return
    setLoading(true)
    setStatus('')
    try {
      // Verify the password by attempting a dummy admin event with it
      // We use the /api/admin/verify endpoint with the raw token as "credential"
      const r = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass.trim() }),
      })
      const data = await r.json()
      if (data.ok && data.token) {
        sessionStorage.setItem('admin_token', data.token)
        setToken(data.token)
        setStatus('')
      } else {
        setStatus(data.error ?? 'Грешна парола')
      }
    } catch {
      setStatus('Мрежова грешка')
    } finally {
      setLoading(false)
    }
  }, [pass])

  // ── Map click handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !isReady) return

    // Change cursor to crosshair in admin mode
    const container = map.getContainer()
    container.style.cursor = 'crosshair'

    const onClick = (e: LeafletMouseEvent) => {
      // Convert lat/lng to pixel coords relative to viewport
      const pt = map.latLngToContainerPoint(e.latlng)
      setPicker({ lat: e.latlng.lat, lng: e.latlng.lng, x: pt.x, y: pt.y })
    }
    map.on('click', onClick)

    return () => {
      container.style.cursor = ''
      map.off('click', onClick)
    }
  }, [map, isReady])

  // ── Place event ────────────────────────────────────────────────────────────
  const placeEvent = useCallback(async (type: EventType, lat: number, lng: number) => {
    setPicker(null)
    if (!token) return
    setStatus('Записване…')
    try {
      const r = await fetch('/api/admin/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type, lat, lng }),
      })
      const data = await r.json()
      if (data.ok) {
        setStatus(`✅ ${SIGNAL_TYPES.find(s => s.type === type)?.label} поставен`)
        setTimeout(() => setStatus(''), 2000)
      } else {
        setStatus(`❌ ${data.error}`)
      }
    } catch {
      setStatus('❌ Мрежова грешка')
    }
  }, [token])

  const logout = useCallback(() => {
    sessionStorage.removeItem('admin_token')
    setToken(null)
    setPass('')
    setPicker(null)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Admin mode banner */}
      {isReady && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000,
          background: 'rgba(220,38,38,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em' }}>
            🔴 ADMIN MODE — клик на картата за сигнал
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {status && <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{status}</span>}
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20, padding: '6px 16px', color: 'white', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Изход
            </button>
          </div>
        </div>
      )}

      {/* Login overlay */}
      {!isReady && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 20,
        }}>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>🔐 Admin вход</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Въведи admin паролата</div>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Парола…"
            autoFocus
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12, padding: '12px 20px',
              color: 'white', fontSize: 16, outline: 'none',
              width: 260, textAlign: 'center',
            }}
          />
          {status && <div style={{ color: '#f5a623', fontSize: 14 }}>{status}</div>}
          <button
            onClick={login}
            disabled={loading}
            style={{
              background: loading ? 'rgba(61,157,243,0.4)' : '#3d9df3',
              border: 'none', borderRadius: 12,
              padding: '12px 40px', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {loading ? 'Проверяване…' : 'Влез'}
          </button>
        </div>
      )}

      {/* Signal type picker — appears at map click location */}
      {picker && isReady && (
        <>
          {/* Dismiss backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 8999 }}
            onClick={() => setPicker(null)}
          />
          <div style={{
            position: 'fixed',
            left: Math.min(picker.x + 10, window.innerWidth - 200),
            top:  Math.min(picker.y - 60, window.innerHeight - 220),
            zIndex: 9001,
            background: 'rgba(10,10,10,0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            overflow: 'hidden',
            minWidth: 180,
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Избери тип
            </div>
            {SIGNAL_TYPES.map(({ type, label, emoji, colour }) => (
              <button
                key={type}
                onClick={() => placeEvent(type, picker.lat, picker.lng)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '13px 16px',
                  background: 'transparent', border: 'none',
                  color: 'white', fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', minHeight: 50,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <span style={{ color: colour }}>{label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  {picker.lat.toFixed(5)}, {picker.lng.toFixed(5)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
