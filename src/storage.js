const store = {
  read(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  },
  remove(key) {
    localStorage.removeItem(key)
  },
}

export default store