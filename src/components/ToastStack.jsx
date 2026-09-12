import { useApp } from '../store'

export default function ToastStack() {
  const { toasts } = useApp()
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
      ))}
    </div>
  )
}