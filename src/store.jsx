import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import storage from './storage'
import { seedTeams, seedAdmin } from './seed'
import { norm, backfillTeam } from './utils'
import ToastStack from './components/ToastStack'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [teams, setTeams] = useState([])
  const [adminCreds, setAdminCreds] = useState({ ...seedAdmin })
  const [session, setSession] = useState(null)
  const [booted, setBooted] = useState(false)
  const [syncState, setSyncState] = useState('loading')
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(list => [...list, { id, message, type }])
    setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => {
    (async () => {
      const savedTeams = storage.read('teams')
      let t = savedTeams ? savedTeams.map(backfillTeam) : seedTeams.map(backfillTeam)
      if (!savedTeams) storage.write('teams', t)
      setTeams(t)

      const savedAdmin = storage.read('adminCreds')
      if (!savedAdmin) storage.write('adminCreds', seedAdmin)
      else setAdminCreds(savedAdmin)

      setSession(storage.read('session'))
      setSyncState('ok')
      setBooted(true)
    })()
  }, [])

  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'teams' && e.newValue) {
        try { setTeams(JSON.parse(e.newValue).map(backfillTeam)) } catch { /* ignore */ }
      }
      if (e.key === 'adminCreds' && e.newValue) {
        try { setAdminCreds(JSON.parse(e.newValue)) } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const updateTeams = useCallback((next) => {
    setTeams(next)
    try {
      storage.write('teams', next)
      setSyncState('ok')
    } catch (err) {
      console.error('Storage save error:', err)
      setSyncState('err')
      toast('Could not save — check your connection and try again.', 'error')
    }
  }, [toast])

  const login = useCallback((user, pass, tab) => {
    if (tab === 'admin') {
      if (norm(user) === norm(adminCreds.username) && pass === adminCreds.password) {
        const s = { role: 'admin' }
        setSession(s)
        storage.write('session', s)
        return true
      }
      return false
    }
    const t = teams.find(x => norm(x.username) === norm(user) && x.password === pass)
    if (t) {
      const s = { role: 'team', teamId: t.id }
      setSession(s)
      storage.write('session', s)
      return true
    }
    return false
  }, [teams, adminCreds])

  const logout = useCallback(() => {
    setSession(null)
    storage.remove('session')
  }, [])

  const setAdminPassword = useCallback((pass) => {
    const next = { username: adminCreds.username, password: pass }
    setAdminCreds(next)
    try {
      storage.write('adminCreds', next)
    } catch (err) {
      console.error(err)
      toast('Could not save admin settings.', 'error')
    }
  }, [adminCreds, toast])

  const resetData = useCallback(() => {
    const t = seedTeams.map(backfillTeam)
    setTeams(t)
    try {
      storage.write('teams', t)
      setSyncState('ok')
    } catch (err) {
      console.error(err)
      setSyncState('err')
    }
    setAdminCreds({ ...seedAdmin })
    try {
      storage.write('adminCreds', seedAdmin)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const value = {
    booted,
    teams,
    adminCreds,
    session,
    syncState,
    toasts,
    toast,
    login,
    logout,
    updateTeams,
    setAdminPassword,
    resetData,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastStack />
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}