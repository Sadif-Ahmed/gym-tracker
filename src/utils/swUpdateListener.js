import { useEffect, useRef, useState } from 'preact/hooks'
import { registerSW } from 'virtual:pwa-register'

// registerType is 'prompt' (vite.config.js) with injectRegister disabled, so
// a new service worker install never swaps in silently mid-session — it
// waits until the app calls updateSW(true). This hook is the toast half of
// that: App.jsx renders a banner while needRefresh is true, and only
// updateNow() actually activates the new version and reloads.
export function useSwUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateSwRef = useRef(null)

  useEffect(() => {
    updateSwRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
  }, [])

  function updateNow() {
    updateSwRef.current?.(true)
  }

  return { needRefresh, updateNow }
}
