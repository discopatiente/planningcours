import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}

function Modal({ title, onClose, wide, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-panel${wide ? ' modal-panel-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
