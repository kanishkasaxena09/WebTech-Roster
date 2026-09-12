import { useEffect, useState } from 'react'
import { Logo } from './Login'

export default function Splash({ done }) {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!done || leaving) return
    const t1 = setTimeout(() => setLeaving(true), 250)
    const t2 = setTimeout(() => setGone(true), 250 + 450)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [done, leaving])

  if (gone) return null

  return (
    <div className={`splash${leaving ? ' splash-leave' : ''}`}>
      <div className="splash-mark">
        <Logo size={30} />
      </div>
      <div className="splash-name">WebTech Roster</div>
      <div className="splash-sub">Web Tech · Sem 5</div>
      <div className="splash-bar"><i /></div>
    </div>
  )
}