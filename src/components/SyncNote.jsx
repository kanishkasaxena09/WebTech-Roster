export default function SyncNote({ state, live }) {
  return (
    <div className="sync-note">
      <span className={`sync-dot${state === 'err' ? ' err' : ''}`} />
      <span>
        {state === 'ok'
          ? (live ? 'synced · live' : 'synced')
          : state === 'err' ? 'save failed — retry' : 'loading…'}
      </span>
    </div>
  )
}