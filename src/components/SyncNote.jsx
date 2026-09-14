export default function SyncNote({ state, live }) {
  let dot = ''
  let text = ''
  if (state === 'ok') {
    if (live) { dot = ''; text = 'synced · live' }
    else { dot = ''; text = 'synced' }
  } else if (state === 'err') {
    dot = 'err'
    text = 'save failed — retry'
  } else if (state === 'local') {
    dot = 'local'
    text = 'offline — local data'
  } else {
    dot = ''
    text = 'loading…'
  }
  return (
    <div className="sync-note">
      <span className={`sync-dot${dot ? ' ' + dot : ''}`} />
      <span>{text}</span>
    </div>
  )
}