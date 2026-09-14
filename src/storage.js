let _ss = null

export const sharedEnabled = () => {
  const url = import.meta.env.VITE_SERVER_URL
  return typeof url === 'string' && url.trim() !== ''
}

function serverUrl() {
  return (import.meta.env.VITE_SERVER_URL || '').replace(/\/+$/, '')
}

function localGet(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function localSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
function localRemove(key) {
  localStorage.removeItem(key)
}
function localSubscribe(key, cb) {
  const handler = (e) => {
    if (e.key === key && e.newValue) {
      try { cb(JSON.parse(e.newValue)) } catch { /* ignore */ }
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

function fetchWithTimeout(url, options = {}, ms = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function apiGet(key) {
  const res = await fetchWithTimeout(`${serverUrl()}/data/${encodeURIComponent(key)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
  return res.json()
}
async function apiSet(key, value) {
  const res = await fetchWithTimeout(`${serverUrl()}/data/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
}
async function apiRemove(key) {
  const res = await fetchWithTimeout(`${serverUrl()}/data/${encodeURIComponent(key)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
}

let _es = null
const _listeners = new Map()
const _connCbs = new Set()
let _lastOnline = null

function setOnline(online) {
  if (_lastOnline === online) return
  _lastOnline = online
  for (const cb of Array.from(_connCbs)) {
    try { cb(online) } catch { /* ignore */ }
  }
}

function startEvents() {
  if (_es) return
  _es = new EventSource(`${serverUrl()}/events`)
  _es.onopen = () => setOnline(true)
  _es.onmessage = (e) => {
    setOnline(true)
    try {
      const msg = JSON.parse(e.data)
      if (!msg || !msg.key) return
      const set = _listeners.get(msg.key)
      if (set) for (const cb of Array.from(set)) cb(msg.value)
    } catch { /* ignore */ }
  }
  _es.onerror = () => setOnline(false)
}

function apiSubscribe(key, cb) {
  startEvents()
  if (!_listeners.has(key)) _listeners.set(key, new Set())
  _listeners.get(key).add(cb)
  return () => {
    const set = _listeners.get(key)
    if (set) {
      set.delete(cb)
      if (set.size === 0) _listeners.delete(key)
    }
    if (_listeners.size === 0 && _es) {
      _es.close()
      _es = null
      _lastOnline = null
    }
  }
}

function onConnectivityChange(cb) {
  _connCbs.add(cb)
  if (_lastOnline !== null) cb(_lastOnline)
  else if (_es && _es.readyState === EventSource.OPEN) cb(true)
  return () => _connCbs.delete(cb)
}

export const local = { get: localGet, set: localSet, remove: localRemove }

export const shared = {
  async get(key) {
    if (!sharedEnabled()) return localGet(key)
    try {
      return await apiGet(key)
    } catch (err) {
      console.error('Remote read failed, using local fallback:', err)
      return localGet(key)
    }
  },
  async set(key, value) {
    if (!sharedEnabled()) {
      localSet(key, value)
      return true
    }
    try {
      await apiSet(key, value)
      return true
    } catch (err) {
      console.error('Remote write failed:', err)
      return false
    }
  },
  async remove(key) {
    if (!sharedEnabled()) {
      localRemove(key)
      return
    }
    try {
      await apiRemove(key)
    } catch (err) {
      console.error('Remote delete failed:', err)
      localRemove(key)
    }
  },
  subscribe(key, cb) {
    if (!sharedEnabled()) return localSubscribe(key, cb)
    return apiSubscribe(key, cb)
  },
  onConnectivityChange,
}