import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useToast — gerencia uma fila de toasts com auto-dismiss
 */
export function useToast() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const addToast = useCallback(({ message, type = 'info', duration = 2500 }) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, exiting: false }])

    timers.current[id] = setTimeout(() => {
      // mark as exiting to trigger exit animation
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        delete timers.current[id]
      }, 300)
    }, duration)
  }, [])

  useEffect(() => {
    return () => Object.values(timers.current).forEach(clearTimeout)
  }, [])

  return { toasts, addToast }
}
