export default function SyncNote({ state }) {
  return (
    <div className="sync-note">
      <span className={`sync-dot${state === 'err' ? ' err' : ''}`} />
      <span>{state === 'ok' ? 'synced' : state === 'err' ? 'save failed — retry' : 'loading…'}</span>
    </div>
  )
}