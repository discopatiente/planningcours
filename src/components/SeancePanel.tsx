import { useState } from 'react'
import Modal from './Modal'

interface SeancePanelProps {
  titre: string
  classeNom: string
  matiereNom: string
  matiereCouleur: string
  date: string
  heureDebut: string
  fait: boolean
  estEvaluation: boolean
  estAnnulee: boolean
  motifAnnulation: string | null
  notesSeance: string | null
  ressourceUrl?: string
  onToggleFait: (fait: boolean) => void
  onEnregistrerNote?: (notes: string) => Promise<void>
  onDeplacer?: (date: string, heureDebut: string) => Promise<void>
  onAnnuler: (motif: string | null) => Promise<void>
  onClose: () => void
}

function formatDateLongue(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function SeancePanel({
  titre,
  classeNom,
  matiereNom,
  matiereCouleur,
  date,
  heureDebut,
  fait,
  estEvaluation,
  estAnnulee,
  motifAnnulation,
  notesSeance,
  ressourceUrl,
  onToggleFait,
  onEnregistrerNote,
  onDeplacer,
  onAnnuler,
  onClose,
}: SeancePanelProps) {
  const [notes, setNotes] = useState(notesSeance ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [nouvelleDate, setNouvelleDate] = useState(date)
  const [nouvelleHeure, setNouvelleHeure] = useState(heureDebut.slice(0, 5))
  const [deplacing, setDeplacing] = useState(false)
  const [motif, setMotif] = useState('')
  const [annulation, setAnnulation] = useState(false)

  return (
    <Modal title={titre} onClose={onClose}>
      <div className="seance-panel-meta">
        <span className="referentiel-group-dot" style={{ background: matiereCouleur }} />
        {classeNom} — {matiereNom} · {formatDateLongue(date)} à {heureDebut.slice(0, 5)}
      </div>

      {estAnnulee ? (
        <p className="seance-panel-annulee">
          Séance annulée{motifAnnulation ? ` — ${motifAnnulation}` : ''}.
        </p>
      ) : (
        <>
          <label className="modal-field modal-field-inline">
            <input type="checkbox" checked={fait} onChange={(e) => onToggleFait(e.target.checked)} />
            Marquer comme fait
          </label>

          {ressourceUrl && (
            <a href={ressourceUrl} target="_blank" rel="noreferrer" className="modal-field-hint">
              ↗ Ouvrir la ressource
            </a>
          )}

          {!estEvaluation && onEnregistrerNote && (
            <label className="modal-field">
              Note post-cours
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button
                type="button"
                className="btn-sm"
                disabled={savingNotes}
                onClick={async () => {
                  setSavingNotes(true)
                  try {
                    await onEnregistrerNote(notes)
                  } finally {
                    setSavingNotes(false)
                  }
                }}
              >
                Enregistrer la note
              </button>
            </label>
          )}

          {!estEvaluation && onDeplacer && (
            <div className="modal-field-group">
              <span className="modal-field-title">Déplacer la séance</span>
              <div className="modal-field-row">
                <input type="date" value={nouvelleDate} onChange={(e) => setNouvelleDate(e.target.value)} />
                <input type="time" value={nouvelleHeure} onChange={(e) => setNouvelleHeure(e.target.value)} />
                <button
                  type="button"
                  className="btn-sm"
                  disabled={deplacing}
                  onClick={async () => {
                    setDeplacing(true)
                    try {
                      await onDeplacer(nouvelleDate, `${nouvelleHeure}:00`)
                      onClose()
                    } finally {
                      setDeplacing(false)
                    }
                  }}
                >
                  Déplacer
                </button>
              </div>
              <span className="modal-field-hint">Repositionne cette séance seule, sans décaler les autres.</span>
            </div>
          )}

          <div className="modal-field-group">
            <span className="modal-field-title">{estEvaluation ? 'Reporter le devoir' : 'Annuler la séance'}</span>
            {!estEvaluation && (
              <input
                type="text"
                placeholder="Motif (optionnel)"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
            )}
            <button
              type="button"
              className="btn-sm btn-danger"
              disabled={annulation}
              onClick={async () => {
                setAnnulation(true)
                try {
                  await onAnnuler(motif.trim() || null)
                  onClose()
                } finally {
                  setAnnulation(false)
                }
              }}
            >
              {estEvaluation ? 'Reporter le devoir' : 'Annuler la séance'}
            </button>
            <span className="modal-field-hint">
              {estEvaluation
                ? 'Ce créneau devient un cours normal ; les séances suivantes de cette classe remontent chacune d\'un cran, et le devoir se replace automatiquement à une date ultérieure.'
                : "Décale toutes les séances suivantes de ce planning d'un créneau."}
            </span>
          </div>
        </>
      )}

      <div className="modal-actions">
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-sm" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Modal>
  )
}

export default SeancePanel
