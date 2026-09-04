/**
 * useAudio — cria e toca sons de feedback via Web Audio API (sem arquivos externos)
 */
export function useAudio() {
  const ctx = () => new (window.AudioContext || window.webkitAudioContext)()

  function playSuccess() {
    const ac = ctx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.frequency.setValueAtTime(880, ac.currentTime)
    osc.frequency.setValueAtTime(1100, ac.currentTime + 0.08)
    gain.gain.setValueAtTime(0.3, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25)
    osc.start()
    osc.stop(ac.currentTime + 0.25)
  }

  function playError() {
    const ac = ctx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, ac.currentTime)
    osc.frequency.setValueAtTime(180, ac.currentTime + 0.1)
    gain.gain.setValueAtTime(0.4, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3)
    osc.start()
    osc.stop(ac.currentTime + 0.3)
  }

  return { playSuccess, playError }
}
