type AC = typeof AudioContext
let ctx: AudioContext | null = null

/** À appeler pendant un toucher de l'utilisateur : l'iPhone n'autorise le son qu'après une action. */
export function unlockAudio() {
  try {
    const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext
    if (!ctx && Ctor) ctx = new Ctor()
    if (ctx?.state === 'suspended') ctx.resume()
  } catch {
    // pas de son disponible : tant pis
  }
}

/** Trois bips courts (et une vibration sur les téléphones qui le permettent). */
export function beep() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    /* non disponible sur iPhone */
  }
  if (!ctx) return
  const c = ctx
  const t0 = c.currentTime + 0.02
  ;[0, 0.28, 0.56].forEach((dt, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = i === 2 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, t0 + dt)
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + dt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.2)
    osc.connect(gain).connect(c.destination)
    osc.start(t0 + dt)
    osc.stop(t0 + dt + 0.22)
  })
}
