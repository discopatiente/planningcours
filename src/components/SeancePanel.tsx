import { useState } from 'react'
import Modal from './Modal'
import type { PresenceEleve, RattrapageDisponible } from '../lib/absences'

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
  estRetard: boolean
  motifAnnulation: string | null
  notesSeance: string | null
  nonTerminee: boolean
  ressourceUrl?: string
  presences?: PresenceEleve[]
  rattrapagesDisponibles?: RattrapageDisponible[]
  onToggleFait: (fait: boolean) => void
  onEnregistrerNote?: (notes: string) => Promise<void>
  onDeplacer?: (date: string, heureDebut: string) => Promise<void>
  onAnnuler: (motif: string | null) => Promise<void>
  onEnregistrerPresences?: (eleveIdsAbsents: string[]) => Promise<void>
  onEnregistrerRattrapages?: (absenceIds: string[]) => Promise<void>
  onToggleNonTerminee?: (nonTerminee: boolean) => Promise<void>
  onDecalerRetard?: () => Promise<void>
  onRattraperRetard?: () => Promise<void>
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
  estRetard,
  motifAnnulation,
  notesSeance,
  nonTerminee,
  ressourceUrl,
  presences,
  rattrapagesDisponibles,
  onToggleFait,
  onEnregistrerNote,
  onDeplacer,
  onAnnuler,
  onEnregistrerPresences,
  onEnregistrerRattrapages,
  onToggleNonTerminee,
  onDecalerRetard,
  onRattraperRetard,
  onClose,
}: SeancePanelProps) {
  const [notes, setNotes] = useState(notesSeance ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [nouvelleDate, setNouvelleDate] = useState(date)
  const [nouvelleHeure, setNouvelleHeure] = useState(heureDebut.slice(0, 5))
  const [deplacing, setDeplacing] = useState(false)
  const [motif, setMotif] = useState('')
  const [annulation, setAnnulation] = useState(false)
  const [decalage, setDecalage] = useState(false)
  const [rattrapageRetard, setRattrapageRetard] = useState(false)
  const [presentsCoches, setPresentsCoches] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((presences ?? []).map((p) => [p.eleveId, !p.absent])),
  )
  const [savingPresences, setSavingPresences] = useState(false)
  const [rattrapagesCoches, setRattrapagesCoches] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((rattrapagesDisponibles ?? []).map((r) => [r.absenceId, true])),
  )
  const [savingRattrapages, setSavingRattrapages] = useState(false)

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
      ) : estRetard ? (
        <>
          <p className="seance-panel-annulee">
            Ce créneau a été laissé vide pour rattraper un retard de progression.
          </p>
          {onRattraperRetard && (
            <div className="modal-field-group">
              <button
                type="button"
                className="btn-sm btn-primary"
                disabled={rattrapageRetard}
                onClick={async () => {
                  setRattrapageRetard(true)
                  try {
                    await onRattraperRetard()
                    onClose()
                  } finally {
                    setRattrapageRetard(false)
                  }
                }}
              >
                Rattraper (avancer la progression)
              </button>
              <span className="modal-field-hint">
                Supprime ce créneau vide et remonte toutes les séances suivantes d'un cran.
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="modal-field modal-field-inline">
            <input type="checkbox" checked={fait} onChange={(e) => onToggleFait(e.target.checked)} />
            Marquer comme fait
          </label>

          {!estEvaluation && onToggleNonTerminee && (
            <label className="modal-field modal-field-inline">
              <input
                type="checkbox"
                checked={nonTerminee}
                onChange={(e) => onToggleNonTerminee(e.target.checked)}
              />
              Séance non terminée (déborde sur la séance suivante)
            </label>
          )}

          {ressourceUrl && (
            <a href={ressourceUrl} target="_blank" rel="noreferrer" className="modal-field-hint">
              ↗ Ouvrir la ressource
            </a>
          )}

          {estEvaluation && presences && presences.length > 0 && onEnregistrerPresences && (
            <div className="modal-field-group">
              <span className="modal-field-title">Présence</span>
              {presences.map((p) => (
                <label
                  key={p.eleveId}
                  className={`modal-field-inline${p.verrouille ? ' modal-field-disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={presentsCoches[p.eleveId] ?? true}
                    disabled={p.verrouille}
                    onChange={(e) => setPresentsCoches((prev) => ({ ...prev, [p.eleveId]: e.target.checked }))}
                  />
                  {p.nomComplet}
                  {p.verrouille && <span className="modal-field-hint"> — rattrapage déjà prévu</span>}
                </label>
              ))}
              <button
                type="button"
                className="btn-sm"
                disabled={savingPresences}
                onClick={async () => {
                  setSavingPresences(true)
                  try {
                    const absents = presences
                      .filter((p) => !p.verrouille && !(presentsCoches[p.eleveId] ?? true))
                      .map((p) => p.eleveId)
                    await onEnregistrerPresences(absents)
                  } finally {
                    setSavingPresences(false)
                  }
                }}
              >
                Enregistrer la présence
              </button>
              <span className="modal-field-hint">
                Les élèves décochés sont comptabilisés pour un rattrapage futur.
              </span>
            </div>
          )}

          {!estEvaluation && rattrapagesDisponibles && rattrapagesDisponibles.length > 0 && onEnregistrerRattrapages && (
            <div className="modal-field-group">
              <span className="modal-field-title">Rattrapage de devoir</span>
              {rattrapagesDisponibles.map((r) => (
                <label key={r.absenceId} className="modal-field-inline">
                  <input
                    type="checkbox"
                    checked={rattrapagesCoches[r.absenceId] ?? true}
                    onChange={(e) => setRattrapagesCoches((prev) => ({ ...prev, [r.absenceId]: e.target.checked }))}
                  />
                  {r.nomComplet} — {r.libelle}
                </label>
              ))}
              <button
                type="button"
                className="btn-sm"
                disabled={savingRattrapages}
                onClick={async () => {
                  setSavingRattrapages(true)
                  try {
                    const retenus = rattrapagesDisponibles
                      .filter((r) => rattrapagesCoches[r.absenceId] ?? true)
                      .map((r) => r.absenceId)
                    await onEnregistrerRattrapages(retenus)
                  } finally {
                    setSavingRattrapages(false)
                  }
                }}
              >
                Enregistrer le rattrapage
              </button>
              <span className="modal-field-hint">
                Décoche les élèves qui ne rattraperont pas leur devoir pendant ce cours.
              </span>
            </div>
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

          {!estEvaluation && onDecalerRetard && (
            <div className="modal-field-group">
              <span className="modal-field-title">Décaler la progression</span>
              <button
                type="button"
                className="btn-sm"
                disabled={decalage}
                onClick={async () => {
                  setDecalage(true)
                  try {
                    await onDecalerRetard()
                    onClose()
                  } finally {
                    setDecalage(false)
                  }
                }}
              >
                Décaler pour rattraper mon retard
              </button>
              <span className="modal-field-hint">
                À utiliser en cas de retard trop important : ce créneau devient vide et toutes les séances
                suivantes reculent d'un cran. Réversible depuis le créneau vide créé.
              </span>
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
