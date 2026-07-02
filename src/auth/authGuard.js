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

// undefined = still checking, otherwise true/false. Mirrors the
// approval check enforced server-side by RLS (see the
// require_approval migration) — this is only for deciding what to
// render, not a security boundary in itself.
export function useApproval(session) {
  const [approved, setApproved] = useState(undefined)

  useEffect(() => {
    if (!session) {
      setApproved(undefined)
      return
    }

    let cancelled = false
    setApproved(undefined)

    supabase
      .from('profiles')
      .select('approved')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        setApproved(!error && data ? data.approved : false)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  return approved
}

export function signOut() {
  return supabase.auth.signOut()
}
