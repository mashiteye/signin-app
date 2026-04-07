import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setOrg(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data: prof } = await supabase.from('profiles').select('*, organizations(*)').eq('user_id', uid).single()
    if (prof) {
      setProfile(prof)
      setOrg(prof.organizations)
    }
    setLoading(false)
  }

  async function signUp({ email, password, fullName, orgName }) {
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr) return { error: authErr }
    const uid = authData.user.id

    const { data: orgData, error: orgErr } = await supabase.from('organizations').insert({ name: orgName }).select().single()
    if (orgErr) return { error: orgErr }

    const { error: profErr } = await supabase.from('profiles').insert({
      user_id: uid, full_name: fullName, org_id: orgData.id, role: 'admin'
    })
    if (profErr) return { error: profErr }

    await supabase.from('audit_log').insert({
      org_id: orgData.id, user_id: uid, action: 'org_created', detail: { org_name: orgName }
    })

    await loadProfile(uid)
    return { error: null }
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, org, loading, signUp, signIn, signOut, loadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
