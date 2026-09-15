import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { local, shared, sharedEnabled } from './storage'
import { seedProjects, emptyProgress } from './seed'
import { norm, backfillTeam, backfillTask, newTask, normalizeProjects, normalizeAdmins } from './utils'
import ToastStack from './components/ToastStack'

const AppContext = createContext(null)

function cloneSeed() {
  return normalizeProjects(JSON.parse(JSON.stringify(seedProjects)))
}

// Development-only fallback Main Admin credential. Never present in a
// production bundle (import.meta.env.DEV is inlined as `false` at build),
// and never persisted to the shared store. Production initialization is an
// explicit owner action (documented in the Stage 1 report).
function devFallbackAdmins() {
  if (!import.meta.env.DEV) return null
  return normalizeAdmins({
    main: { username: 'mainadmin', password: 'main123', enabled: true, name: 'Website Admin (dev)' },
  })
}

export function AppProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [admins, setAdmins] = useState(null)
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

  const persistAdmins = useCallback(async (next) => {
    const normalized = normalizeAdmins(next)
    setAdmins(normalized)
    if (!normalized) return false
    const ok = await shared.set('admins', normalized)
      .catch(err => { console.error(err); return false })
    if (ok) setSyncState('ok')
    else { setSyncState('err'); toast('Could not save admin settings — check your connection.', 'error') }
    return ok
  }, [toast])

  const currentProject = useMemo(
    () => (session && session.projectId ? projects.find(p => p.id === session.projectId) || null : null),
    [session, projects]
  )
  const teams = currentProject ? currentProject.teams : []

  useEffect(() => {
    let cancelled = false

    const boot = (async () => {
      let finalProjects = []
      let finalAdmins = null
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

        const savedAdmins = await shared.get('admins')
        finalAdmins = normalizeAdmins(savedAdmins)
        if (!finalAdmins && import.meta.env.DEV) finalAdmins = devFallbackAdmins()
      } catch (err) {
        console.error(err)
        finalProjects = cloneSeed()
        if (!finalAdmins && import.meta.env.DEV) finalAdmins = devFallbackAdmins()
      }
      return { projects: finalProjects, admins: finalAdmins }
    })()

    Promise.race([
      boot,
      new Promise(resolve => setTimeout(() => resolve('timeout'), 30000)),
    ]).then((result) => {
      if (cancelled) return

      let finalProjects
      let finalAdmins = null
      let status = 'ok'
      if (result === 'timeout') {
        console.warn('Remote boot timed out — continuing with local data.')
        finalProjects = normalizeProjects(local.get('projects'))
        if (!finalProjects.length) finalProjects = cloneSeed()
        finalAdmins = normalizeAdmins(local.get('admins'))
        if (!finalAdmins && import.meta.env.DEV) finalAdmins = devFallbackAdmins()
        status = 'local'
        toast('Live sync is offline right now — showing local data. Changes won\'t reach the server until it responds.', 'error')
      } else {
        finalProjects = result.projects
        finalAdmins = result.admins
      }

      setProjects(finalProjects)
      setAdmins(finalAdmins)

      const savedSession = local.get('session')
      if (savedSession && savedSession.role === 'main') {
        setSession({ role: 'main', projectScope: 'all' })
      } else if (
        savedSession && savedSession.role === 'admin' &&
        savedSession.projectId && finalProjects.some(p => p.id === savedSession.projectId)
      ) {
        setSession(savedSession)
      } else if (
        savedSession && savedSession.role === 'team' &&
        savedSession.projectId && savedSession.teamId &&
        finalProjects.some(p => p.id === savedSession.projectId && p.teams.some(t => t.id === savedSession.teamId))
      ) {
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
    const offAdmins = shared.subscribe('admins', (value) => {
      if (value == null) return
      const normalized = normalizeAdmins(value)
      if (normalized) setAdmins(normalized)
      setSyncState('ok')
    })
    return () => { offAdmins() }
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
    const t = proj.teams.find(x => norm(x.username) === norm(user) && x.password === pass && x.enabled !== false)
    if (t) {
      const s = { role: 'team', projectId: proj.id, teamId: t.id }
      setSession(s)
      local.set('session', s)
      return true
    }
    return false
  }, [projects])

  const loginMain = useCallback((user, pass) => {
    const main = admins && admins.main
    if (!main || !main.enabled) return false
    if (!user || !pass) return false
    if (norm(user) === norm(main.username) && pass === main.password) {
      const s = { role: 'main', projectScope: 'all' }
      setSession(s)
      local.set('session', s)
      return true
    }
    return false
  }, [admins])

  const logout = useCallback(() => {
    setSession(null)
    local.remove('session')
  }, [])

  // ── central authorization ────────────────────────────────────────────
  const canWriteProject = useCallback((projectId) => {
    if (!session) return false
    if (session.role === 'main') return true
    return !!projectId && session.projectId === projectId
  }, [session])

  const isAdminish = useCallback(() => {
    return !!session && (session.role === 'admin' || session.role === 'main')
  }, [session])

  const canManageAdmins = useCallback(() => {
    return !!session && session.role === 'main'
  }, [session])

  // Single guarded writer. Every project mutation must go through here.
  const mutateProject = useCallback((projectId, mutator) => {
    if (!canWriteProject(projectId)) return false
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return false
    const nextProj = mutator(proj)
    if (nextProj === proj) return true
    const next = projects.map(p => p.id === projectId ? nextProj : p)
    persistProjects(next)
    return true
  }, [canWriteProject, projects, persistProjects])

  // ── team / project mutations ─────────────────────────────────────────
  const updateTeams = useCallback((nextTeams) => {
    if (!session) return false
    if (session.role === 'team') {
      const mine = (nextTeams || []).find(t => t.id === session.teamId)
      if (!mine) return false
      const guarded = teams.map(t => t.id === session.teamId ? mine : t)
      return mutateProject(session.projectId, p => ({ ...p, teams: guarded }))
    }
    return mutateProject(session.projectId, p => ({ ...p, teams: nextTeams }))
  }, [session, teams, mutateProject])

  const mutateTeams = useCallback((updater) => {
    if (!isAdminish()) return false
    return mutateProject(session.projectId, p => ({ ...p, teams: updater(p.teams) }))
  }, [isAdminish, session, mutateProject])

  const updateAnyProject = useCallback((projectId, patch) => {
    if (!projectId || !canWriteProject(projectId) || !isAdminish()) return false
    return mutateProject(projectId, p => ({
      ...p,
      ...patch,
      status: patch.status === 'archived' ? 'archived' : 'active',
      description: typeof patch.description === 'string' ? patch.description : p.description,
      name: typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : p.name,
    }))
  }, [canWriteProject, isAdminish, mutateProject])

  const updateProject = useCallback((patch) => {
    return updateAnyProject(session ? session.projectId : null, patch)
  }, [session, updateAnyProject])

  const addTeam = useCallback((data) => {
    if (!isAdminish()) return null
    const t = backfillTeam({
      id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      project: String(data.project || '').trim(),
      description: String(data.description || '').trim(),
      leader: String(data.leader || '').trim(),
      members: Array.isArray(data.members) ? data.members : [],
      username: data.username,
      password: data.password,
      enabled: data.enabled !== false,
      progress: data.progress,
      tasks: Array.isArray(data.tasks) ? data.tasks.map(backfillTask) : [],
    })
    const ok = mutateTeams(list => [...list, t])
    return ok ? t : null
  }, [isAdminish, mutateTeams])

  const updateAnyTeam = useCallback((projectId, teamId, patch) => {
    if (!projectId || !teamId || !canWriteProject(projectId) || !isAdminish()) return false
    return mutateProject(projectId, p => ({
      ...p,
      teams: p.teams.map(t =>
        t.id === teamId
          ? backfillTeam({
              ...t,
              ...patch,
              project: typeof patch.project === 'string' && patch.project.trim() ? patch.project.trim() : t.project,
              members: Array.isArray(patch.members) ? patch.members : t.members,
              tasks: patch.tasks ? patch.tasks.map(backfillTask) : t.tasks,
            })
          : t
      ),
    }))
  }, [canWriteProject, isAdminish, mutateProject])

  const updateTeam = useCallback((id, patch) => {
    return updateAnyTeam(session ? session.projectId : null, id, patch)
  }, [session, updateAnyTeam])

  const removeTeam = useCallback((id) => {
    return mutateTeams(list => list.filter(t => t.id !== id))
  }, [mutateTeams])

  const toggleTeamEnabled = useCallback((id) => {
    let nextEnabled = true
    mutateTeams(list => list.map(t => {
      if (t.id === id) {
        nextEnabled = !t.enabled
        return { ...t, enabled: nextEnabled }
      }
      return t
    }))
    return nextEnabled
  }, [mutateTeams])

  const regenTeamPassword = useCallback((id) => {
    const pass = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4)
    updateTeam(id, { password: pass })
    return pass
  }, [updateTeam])

  const setTeamProgress = useCallback((teamId, key, value) => {
    return mutateTeams(list => list.map(t =>
      t.id === teamId
        ? { ...t, progress: { ...emptyProgress(), ...t.progress, [key]: !!value } }
        : t
    ))
  }, [mutateTeams])

  const toggleTeamProgress = useCallback((teamId, key) => {
    return mutateTeams(list => list.map(t =>
      t.id === teamId
        ? { ...t, progress: { ...emptyProgress(), ...t.progress, [key]: !(t.progress && t.progress[key]) } }
        : t
    ))
  }, [mutateTeams])

  // ── global (Main Admin) project-scoped team/task actions ────────────
  // These operate on an explicit projectId and are guarded by the same
  // central authorization, so a Web Admin can never reach `ml` and vice
  // versa. All writes flow through mutateProject → persistProjects.
  const addTeamToProject = useCallback((projectId, data) => {
    if (!isAdminish() || !canWriteProject(projectId)) return null
    const t = backfillTeam({
      id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      project: String(data.project || '').trim(),
      description: String(data.description || '').trim(),
      leader: String(data.leader || '').trim(),
      members: Array.isArray(data.members) ? data.members : [],
      username: data.username,
      password: data.password,
      enabled: data.enabled !== false,
      progress: data.progress,
      tasks: Array.isArray(data.tasks) ? data.tasks.map(backfillTask) : [],
    })
    return mutateProject(projectId, p => ({ ...p, teams: [...p.teams, t] })) ? t : null
  }, [isAdminish, canWriteProject, mutateProject])

  const deleteTeamFromProject = useCallback((projectId, teamId) => {
    if (!isAdminish() || !canWriteProject(projectId)) return false
    return mutateProject(projectId, p => ({ ...p, teams: p.teams.filter(t => t.id !== teamId) }))
  }, [isAdminish, canWriteProject, mutateProject])

  const toggleTeamEnabledInProject = useCallback((projectId, teamId) => {
    if (!isAdminish() || !canWriteProject(projectId)) return false
    let next = true
    mutateProject(projectId, p => ({
      ...p,
      teams: p.teams.map(t => {
        if (t.id !== teamId) return t
        next = !t.enabled
        return { ...t, enabled: next }
      }),
    }))
    return next
  }, [isAdminish, canWriteProject, mutateProject])

  const regenTeamPasswordInProject = useCallback((projectId, teamId) => {
    const pass = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4)
    updateAnyTeam(projectId, teamId, { password: pass })
    return pass
  }, [updateAnyTeam])

  const toggleTeamProgressInProject = useCallback((projectId, teamId, key) => {
    if (!isAdminish() || !canWriteProject(projectId)) return false
    return mutateProject(projectId, p => ({
      ...p,
      teams: p.teams.map(t =>
        t.id === teamId
          ? { ...t, progress: { ...emptyProgress(), ...t.progress, [key]: !(t.progress && t.progress[key]) } }
          : t
      ),
    }))
  }, [isAdminish, canWriteProject, mutateProject])

  const saveTaskInProject = useCallback((projectId, teamId, task) => {
    if (!isAdminish() || !canWriteProject(projectId)) return null
    const fixed = task.id && task.title ? backfillTask(task) : newTask(task)
    mutateProject(projectId, p => ({
      ...p,
      teams: p.teams.map(t => {
        if (t.id !== teamId) return t
        const exists = (t.tasks || []).some(x => x.id === fixed.id)
        return {
          ...t,
          tasks: exists
            ? (t.tasks || []).map(x => x.id === fixed.id ? fixed : x)
            : [...(t.tasks || []), fixed],
        }
      }),
    }))
    return fixed
  }, [isAdminish, canWriteProject, mutateProject])

  const deleteTaskInProject = useCallback((projectId, teamId, taskId) => {
    if (!isAdminish() || !canWriteProject(projectId)) return false
    return mutateProject(projectId, p => ({
      ...p,
      teams: p.teams.map(t =>
        t.id === teamId
          ? { ...t, tasks: (t.tasks || []).filter(x => x.id !== taskId) }
          : t
      ),
    }))
  }, [isAdminish, canWriteProject, mutateProject])

  const saveTask = useCallback((teamId, task) => {
    if (!isAdminish()) return null
    const fixed = task.id && task.title ? backfillTask(task) : newTask(task)
    mutateTeams(list => list.map(t => {
      if (t.id !== teamId) return t
      const exists = (t.tasks || []).some(x => x.id === fixed.id)
      const tasks = exists
        ? (t.tasks || []).map(x => x.id === fixed.id ? fixed : x)
        : [...(t.tasks || []), fixed]
      return { ...t, tasks }
    }))
    return fixed
  }, [isAdminish, mutateTeams])

  const deleteTask = useCallback((teamId, taskId) => {
    return mutateTeams(list => list.map(t =>
      t.id === teamId
        ? { ...t, tasks: (t.tasks || []).filter(x => x.id !== taskId) }
        : t
    ))
  }, [mutateTeams])

  const updateAnyTask = useCallback((projectId, teamId, taskId, patch) => {
    if (!projectId || !teamId || !taskId || !canWriteProject(projectId) || !isAdminish()) return false
    return mutateProject(projectId, p => ({
      ...p,
      teams: p.teams.map(t =>
        t.id === teamId
          ? {
              ...t,
              tasks: (t.tasks || []).map(x => x.id === taskId ? { ...x, ...patch } : x),
            }
          : t
      ),
    }))
  }, [canWriteProject, isAdminish, mutateProject])

  const setTaskStatus = useCallback((teamId, taskId, status) => {
    return updateAnyTask(session ? session.projectId : null, teamId, taskId,
      status === 'done' ? { status, progress: 100 } : { status })
  }, [session, updateAnyTask])

  const setAdminPassword = useCallback((pass) => {
    if (!isAdminish()) return false
    return mutateProject(session.projectId, p => ({ ...p, admin: { ...p.admin, password: pass } }))
  }, [isAdminish, session, mutateProject])

  // ── main admin account actions ───────────────────────────────────────
  const updateMainAdmin = useCallback((patch) => {
    if (!canManageAdmins()) return false
    return persistAdmins({
      ...(admins || {}),
      main: { ...(admins && admins.main ? admins.main : {}), ...patch },
    })
  }, [canManageAdmins, admins, persistAdmins])

  const toggleMainAdmin = useCallback((force) => {
    const cur = !!(admins && admins.main && admins.main.enabled)
    return updateMainAdmin({ enabled: force === undefined ? !cur : !!force })
  }, [admins, updateMainAdmin])

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
    admins,
    project: currentProject,
    teams,
    session,
    syncState,
    live,
    toasts,
    toast,
    login,
    loginMain,
    logout,
    updateTeams,
    updateProject,
    updateAnyProject,
    addTeam,
    updateTeam,
    updateAnyTeam,
    removeTeam,
    toggleTeamEnabled,
    regenTeamPassword,
    setTeamProgress,
    toggleTeamProgress,
    saveTask,
    deleteTask,
    setTaskStatus,
    updateAnyTask,
    updateMainAdmin,
    toggleMainAdmin,
    addTeamToProject,
    deleteTeamFromProject,
    toggleTeamEnabledInProject,
    regenTeamPasswordInProject,
    toggleTeamProgressInProject,
    saveTaskInProject,
    deleteTaskInProject,
    setAdminPassword,
    resetData,
    canWriteProject,
    canManageAdmins,
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__WRD = {
      login, loginMain, logout, session, teams, projects, admins,
      updateTeams, updateProject, updateAnyProject,
      addTeam, updateTeam, updateAnyTeam,
      saveTask, updateAnyTask,
      updateMainAdmin, toggleMainAdmin,
      addTeamToProject, deleteTeamFromProject,
      toggleTeamEnabledInProject, regenTeamPasswordInProject,
      toggleTeamProgressInProject, saveTaskInProject, deleteTaskInProject,
      canWriteProject, canManageAdmins,
    }
  }, [
    login, loginMain, logout, session, teams, projects, admins,
    updateTeams, updateProject, updateAnyProject,
    addTeam, updateTeam, updateAnyTeam,
    saveTask, updateAnyTask,
    updateMainAdmin, toggleMainAdmin,
    addTeamToProject, deleteTeamFromProject,
    toggleTeamEnabledInProject, regenTeamPasswordInProject,
    toggleTeamProgressInProject, saveTaskInProject, deleteTaskInProject,
    canWriteProject, canManageAdmins,
  ])

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