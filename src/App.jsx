import { useEffect, useState } from 'react'
import { useApp } from './store'
import Splash from './components/Splash'
import Login from './components/Login'
import TeamApp from './team/TeamApp'
import AdminApp from './admin/AdminApp'

export default function App() {
  const { booted, session, teams, toast, logout } = useApp()
  const [minHold, setMinHold] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinHold(true), 1600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!booted) return
    if (session && session.role === 'team') {
      const t = teams.find(x => x.id === session.teamId)
      if (!t) {
        toast('Your team login is no longer valid — contact your admin.', 'error')
        logout()
      }
    }
  }, [booted, session, teams, toast, logout])

  const splashDone = booted && minHold

  if (!booted) return <Splash done={false} />

  return (
    <>
      <Splash done={splashDone} />
      {!session ? <Login /> : session.role === 'admin' ? <AdminApp /> : <TeamApp />}
    </>
  )
}