import { useState } from 'react'
import Modal from './Modal'
import type { Planning } from '../types/planning'
import type { Classe } from '../types/classe'
import type { Progression } from '../types/progression'
import type { Matiere } from '../types/matiere'

interface OptionPlanning {
  planning: Planning
  classe: Classe
  progression: Progression
  matiere: Matiere | null
}

interface SeanceExceptionnelleModalProps {
  options: OptionPlanning[]
  onEnregistrer: (planningId: string, progressionId: string, date: string, heureDebut: string) => Promise<void>
  onClose: () => void
}

function SeanceExceptionnelleModal({ options, onEnregistrer, onClose }: SeanceExceptionnelleModalProps) {
  const [planningId, setPlanningId] = useState(options[0]?.planning.id ?? '')
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('08:00')
  const [saving, setSaving] = useState(false)

  const selection = options.find((o) => o.planning.id === planningId)

  return (
    <Modal title="Ajouter une séance exceptionnelle" onClose={onClose}>
      <label className="modal-field">
        Classe / matière
        <select value={planningId} onChange={(e) => setPlanningId(e.target.value)}>
          {options.map((o) => (
            <option key={o.planning.id} value={o.planning.id}>
              {o.classe.nom} — {o.matiere?.nom ?? '?'} ({o.progression.nom})
            </option>
          ))}
        </select>
      </label>

      <label className="modal-field">
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="modal-field">
        Heure
        <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
      </label>

      <span className="modal-field-hint">
        Reprend automatiquement la prochaine unité de la progression pas encore programmée (en priorité une unité en
        excédent). Les séances déjà programmées après cette date ne sont pas affectées.
      </span>

      <div className="modal-actions">
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-sm" onClick={onClose}>
          Annuler
        </button>
        <button
          type="button"
          className="btn-sm btn-primary"
          disabled={saving || !planningId || !date}
          onClick={async () => {
            if (!selection) return
            setSaving(true)
            try {
              await onEnregistrer(selection.planning.id, selection.progression.id, date, `${heure}:00`)
              onClose()
            } finally {
              setSaving(false)
            }
          }}
        >
          Ajouter
        </button>
      </div>
    </Modal>
  )
}

export default SeanceExceptionnelleModal
