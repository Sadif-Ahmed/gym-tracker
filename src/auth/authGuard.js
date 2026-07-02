import { useEffect, useState } from 'preact/hooks'
import { supabase } from '../lib/supabaseClient.js'

// undefined = still checking for an existing session, null = signed out, Session = signed in
export function useSession() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  return session
}

export function signOut() {
  return supabase.auth.signOut()
}
