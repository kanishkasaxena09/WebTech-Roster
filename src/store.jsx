import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { local, shared, sharedEnabled } from './storage'
import { seedProjects } from './seed'
import { norm, backfillTeam, normalizeProjects } from './utils'
import ToastStack from './components/ToastStack'

const AppContext = createContext(null)

function cloneSeed() {
  return normalizeProjects(JSON.parse(JSON.stringify(seedProjects)))
}

export function AppProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [session, setSession] = useState(null)
  const [booted, setBooted] = useState(false)
  const [syncState, setSyncState] = useState('loading')
  const [toasts, setToasts] = useState([])

  const live = sharedEnabled()

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(list => [...list, { id, message, type }])
    setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 3000)
  }, [])

  const persistProjects = useCallback(async (next) => {
    setProjects(next)
    const ok = await shared.set('projects', next)
      .catch(err => { console.error(err); return false })
    if (ok) setSyncState('ok')
    else { setSyncState('err'); toast('Could not save — check your connection and try again.', 'error') }
  }, [toast])

  const currentProject = useMemo(
    () => (session ? projects.find(p => p.id === session.projectId) || null : null),
    [session, projects]
  )
  const teams = currentProject ? currentProject.teams : []

  useEffect(() => {
    let cancelled = false

    const boot = (async () => {
      let finalProjects = []
      try {
        let saved = await shared.get('projects')
        if (Array.isArray(saved) && saved.length) {
          finalProjects = normalizeProjects(saved)
        } else {
          finalProjects = cloneSeed()
          try {
            const legacyTeams = await shared.get('teams') || local.get('teams')
            const legacyAdmin = await shared.get('adminCreds') || local.get('adminCreds')
            if (Array.isArray(legacyTeams) && legacyTeams.length) finalProjects[0].teams = legacyTeams.map(backfillTeam)
            if (legacyAdmin && typeof legacyAdmin === 'object') finalProjects[0].admin = { ...finalProjects[0].admin, ...legacyAdmin }
            await shared.remove('teams')
            await shared.remove('adminCreds')
          } catch (err) {
            console.error('Migration failed:', err)
          }
          await shared.set('projects', finalProjects)
            .catch(err => console.error(err))
        }
      } catch (err) {
        console.error(err)
        finalProjects = cloneSeed()
      }
      return finalProjects
    })()

    Promise.race([
      boot,
      new Promise(resolve => setTimeout(() => resolve('timeout'), 30000)),
    ]).then((result) => {
      if (cancelled) return

      let finalProjects
      let status = 'ok'
      if (result === 'timeout') {
        console.warn('Remote boot timed out — continuing with local data.')
        finalProjects = normalizeProjects(local.get('projects'))
        if (!finalProjects.length) finalProjects = cloneSeed()
        status = 'local'
        toast('Live sync is offline right now — showing local data. Changes won\'t reach the server until it responds.', 'error')
      } else {
        finalProjects = result
      }

      setProjects(finalProjects)

      const savedSession = local.get('session')
      if (savedSession && savedSession.projectId && finalProjects.some(p => p.id === savedSession.projectId)) {
        setSession(savedSession)
      } else if (savedSession) {
        local.remove('session')
      }
      setSyncState(status)
      setBooted(true)
    })

    return () => { cancelled = true }
  }, [toast])

  useEffect(() => {
    const offProjects = shared.subscribe('projects', (value) => {
      if (value == null) return
      setProjects(normalizeProjects(value))
      setSyncState('ok')
    })
    return () => { offProjects() }
  }, [])

  useEffect(() => {
    if (!live) return
    return shared.onConnectivityChange((online) => {
      setSyncState(prev => {
        if (prev === 'loading') return prev
        return online ? 'ok' : 'local'
      })
    })
  }, [live])

  const login = useCallback((projectId, user, pass, tab) => {
    if (!projectId) return false
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return false
    if (tab === 'admin') {
      if (norm(user) === norm(proj.admin.username) && pass === proj.admin.password) {
        const s = { role: 'admin', projectId: proj.id }
        setSession(s)
        local.set('session', s)
        return true
      }
      return false
    }
    const t = proj.teams.find(x => norm(x.username) === norm(user) && x.password === pass)
    if (t) {
      const s = { role: 'team', projectId: proj.id, teamId: t.id }
      setSession(s)
      local.set('session', s)
      return true
    }
    return false
  }, [projects])

  const logout = useCallback(() => {
    setSession(null)
    local.remove('session')
  }, [])

  const updateTeams = useCallback((nextTeams) => {
    if (!session) return
    const next = projects.map(p => p.id === session.projectId ? { ...p, teams: nextTeams } : p)
    persistProjects(next)
  }, [session, projects, persistProjects])

  const setAdminPassword = useCallback((pass) => {
    if (!session) return
    const next = projects.map(p => p.id === session.projectId
      ? { ...p, admin: { ...p.admin, password: pass } }
      : p)
    persistProjects(next)
  }, [session, projects, persistProjects])

  const resetData = useCallback(() => {
    const proj = cloneSeed()
    setProjects(proj)
    setSyncState('ok')
    shared.set('projects', proj)
      .catch(err => { console.error(err); setSyncState('err') })
  }, [])

  const value = {
    booted,
    projects,
    project: currentProject,
    teams,
    session,
    syncState,
    live,
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