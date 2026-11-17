import { useEffect } from 'react'
export function useAppEffects(theme: 'dark' | 'light', panelOpen: boolean) {
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('helios-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])
  useEffect(() => {
    document.documentElement.classList.toggle('panel-open', panelOpen)
  }, [panelOpen])
}
