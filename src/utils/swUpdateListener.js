import { useEffect } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'

// registerType is 'prompt' (vite.config.js) with injectRegister disabled, so
// a new service worker install never swaps in silently mid-session — it
// waits until the app calls updateServiceWorker(). This hook is the toast
// half of that: App.jsx renders a banner while needRefresh is true, and
// only updateNow() actually skips waiting; the reload itself is driven by
// our own controllerchange listener rather than relying on the plugin's
// internal one, since the moment navigator.serviceWorker.controller
// actually changes is the one thing we can observe directly and trust.
export function useSwUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let reloaded = false
    function handleControllerChange() {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  return { needRefresh, updateNow: () => updateServiceWorker(true) }
}
