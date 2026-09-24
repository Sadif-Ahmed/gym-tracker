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

    // On a first visit there's no controller yet, and clientsClaim makes the
    // freshly installed worker take over - firing controllerchange with
    // nothing to update from. Reloading then would wipe whatever a new user
    // has already typed (e.g. the login form), so only reload when an older
    // worker was actually replaced.
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloaded = false
    function handleControllerChange() {
      if (!hadController || reloaded) return
      reloaded = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  return { needRefresh, updateNow: () => updateServiceWorker(true) }
}
