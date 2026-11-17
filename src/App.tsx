import { useEffect, useState, type ComponentType } from 'react'
import { MOCKUPS } from './mockups/registry'
import MockupSelector from './pages/MockupSelector'

function routeFromHash(): string | null {
  const m = window.location.hash.match(/^#\/(mockup-[\w-]+)/)
  if (m) {
    const entry = MOCKUPS.find((x) => x.id === m[1])
    if (entry) return entry.id
  }
  return null
}

// Hash router: '#/mockup-XX' renders that mockup's root component in-place, '/' shows the selector.
export default function App() {
  const [route, setRoute] = useState<string | null>(() => (window.location.hash ? routeFromHash() : null))

  useEffect(() => {
    const onHash = () => {
      // Unknown mockup ids fall back to the selector.
      if (window.location.hash.startsWith('#/') && !routeFromHash()) window.location.hash = ''
      setRoute(routeFromHash())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route) {
    return MOCKUPS.filter((m) => m.id === route).map((m) => {
      const C: ComponentType = m.Component
      return <C key={route} />
    })[0]
  }
  return <MockupSelector />
}
