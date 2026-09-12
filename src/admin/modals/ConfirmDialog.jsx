export default function ConfirmDialog({ confirm, onClose }) {
  const run = () => {
    onClose()
    confirm.fn()
  }
  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>{confirm.title}</h3>
        <p>{confirm.message}</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={run}>Confirm</button>
        </div>
      </div>
    </div>
  )
}