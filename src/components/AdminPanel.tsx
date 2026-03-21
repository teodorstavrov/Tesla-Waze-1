/**
 * AdminPanel — visible only when URL contains ?admin
 * Flow: Google Sign-In → backend verify → admin map-click mode
 * In admin mode: click anywhere on map → choose signal type → saved to DB
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Map as LMap, LeafletMouseEvent } from 'leaflet'
import type { EventType } from '@/features/events/types'

interface Props { map: LMap | null }

type Step = 'login' | 'verifying' | 'ready'

const SIGNAL_TYPES: Array<{ type: EventType; label: string; emoji: string; colour: string }> = [
  { type: 'police',   label: 'Полиция',    emoji: '🚔', colour: '#3d9df3' },
  { type: 'camera',   label: 'Камера',     emoji: '📷', colour: '#8e44ad' },
  { type: 'accident', label: 'Катастрофа', emoji: '💥', colour: '#e31937' },
  { type: 'danger',   label: 'Опасност',   emoji: '⚠️', colour: '#f5a623' },
]

// Google credential callback type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void
          renderButton: (el: HTMLElement, cfg: object) => void
          prompt: () => void
        }
      }
    }
  }
}

// Only active when URL has ?admin
const IS_ADMIN_URL = typeof window !== 'undefined' && window.location.search.includes('admin')

export function AdminPanel({ map }: Props) {
  const [step,    setStep]    = useState<Step>('login')
  const [token,   setToken]   = useState<string | null>(() => sessionStorage.getItem('admin_token'))
  const [status,  setStatus]  = useState('')
  const [picker,  setPicker]  = useState<{ lat: number; lng: number; x: number; y: number } | null>(null)
  const btnRef = useRef<HTMLDivElement>(null)

  // Not on admin URL — render nothing
  if (!IS_ADMIN_URL) return null

  // Already have token → skip to ready
  const currentStep: Step = token ? 'ready' : step

  // ── Google Sign-In init ────────────────────────────────────────────────────
  useEffect(() => {
    if (token) return
    const clientId = import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined
    if (!clientId) { setStatus('VITE_GOOGLE_CLIENT_ID не е зададен'); return }

    const tryInit = () => {
      if (!window.google) { setTimeout(tryInit, 300); return }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (res) => {
          setStep('verifying')
          setStatus('Проверяване…')
          try {
            const r = await fetch('/api/admin/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: res.credential }),
            })
            const data = await r.json()
            if (data.ok && data.token) {
              sessionStorage.setItem('admin_token', data.token)
              setToken(data.token)
              setStatus('Влязъл си успешно!')
            } else {
              setStep('login')
              setStatus(data.error ?? 'Грешка при вход')
            }
          } catch {
            setStep('login')
            setStatus('Мрежова грешка')
          }
        },
      })
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_black', size: 'large', text: 'signin_with',
          shape: 'pill', locale: 'bg',
        })
      }
    }
    tryInit()
  }, [token])

  // ── Map click handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || currentStep !== 'ready') return

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
  }, [map, currentStep])

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
    setStep('login')
    setPicker(null)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Admin mode banner */}
      {currentStep === 'ready' && (
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
      {currentStep !== 'ready' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 24,
        }}>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>🔐 Admin вход</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Влез с teodorstavrov@gmail.com
          </div>
          {status && (
            <div style={{ color: '#f5a623', fontSize: 14, fontWeight: 500 }}>{status}</div>
          )}
          <div ref={btnRef} />
        </div>
      )}

      {/* Signal type picker — appears at map click location */}
      {picker && currentStep === 'ready' && (
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
