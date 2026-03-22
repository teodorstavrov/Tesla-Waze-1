/**
 * audioManager — Tesla-safe, gesture-gated audio system.
 *
 * Tesla browser blocks AudioContext + speechSynthesis until a real user gesture.
 * All sounds must go through this manager to ensure unlock-before-play safety.
 *
 * Usage:
 *   audioManager.unlock()          // call from first user gesture handler
 *   audioManager.playUI('confirm') // play a short UI beep
 *   audioManager.speak('text')     // TTS voice prompt
 */

type SoundName = 'confirm' | 'report' | 'alert'

interface AudioManager {
  unlock():                    void
  isUnlocked():                boolean
  playUI(name: SoundName):     void
  speak(text: string):         void
  setSpeechEnabled(v: boolean): void
  setSoundEnabled(v: boolean):  void
}

let _unlocked        = false
let _soundEnabled    = true
let _speechEnabled   = true
let _audioCtx:         AudioContext | null = null
let _speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function getCtx(): AudioContext | null {
  if (!_unlocked) return null
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch { return null }
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {})
  }
  return _audioCtx
}

/** Synthesise a short beep using Web Audio API */
function beep(ctx: AudioContext, freq: number, durationS: number, gainVal = 0.18): void {
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type            = 'sine'
    gain.gain.setValueAtTime(gainVal, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationS)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + durationS)
  } catch { /* ignore */ }
}

const SOUNDS: Record<SoundName, (ctx: AudioContext) => void> = {
  confirm: (ctx) => {
    beep(ctx, 880, 0.08, 0.15)
    setTimeout(() => beep(ctx, 1100, 0.10, 0.12), 80)
  },
  report: (ctx) => {
    beep(ctx, 660, 0.07, 0.18)
    setTimeout(() => beep(ctx, 880, 0.09, 0.14), 70)
    setTimeout(() => beep(ctx, 1100, 0.08, 0.10), 150)
  },
  alert: (ctx) => {
    beep(ctx, 440, 0.15, 0.22)
    setTimeout(() => beep(ctx, 550, 0.12, 0.18), 160)
  },
}

export const audioManager: AudioManager = {
  unlock() {
    if (_unlocked) return
    _unlocked = true
    console.log('[audio] unlocked')

    // Resume / create context eagerly now that we have a gesture
    const ctx = getCtx()
    if (ctx) {
      ctx.resume().catch(() => {})
    }

    // Warm up speechSynthesis — Tesla requires at least one call during gesture
    if (_speechSupported) {
      try {
        const u = new SpeechSynthesisUtterance('')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch { _speechSupported = false }
    }
  },

  isUnlocked() { return _unlocked },

  playUI(name) {
    if (!_soundEnabled) return
    if (!_unlocked) { console.log('[audio] play skipped because locked'); return }
    const ctx = getCtx()
    if (!ctx) return
    SOUNDS[name]?.(ctx)
  },

  speak(text) {
    if (!_speechEnabled || !_speechSupported) return
    if (!_unlocked) { console.log('[audio] speak skipped because locked'); return }
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang   = 'bg-BG'
      u.rate   = 0.95
      u.volume = 0.9
      window.speechSynthesis.speak(u)
    } catch { /* ignore */ }
  },

  setSpeechEnabled(v) { _speechEnabled = v },
  setSoundEnabled(v)  { _soundEnabled  = v },
}
