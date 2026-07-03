import { useState } from 'react'
import Modal from './Modal'
import type { Classe } from '../types/classe'
import type { Matiere } from '../types/matiere'
import type { FrequenceCreneau } from '../types/creneau'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const NOUVELLE_CLASSE = '__nouvelle__'

interface CreneauModalProps {
  jourSemaine: number
  heureDebut: string
  classes: Classe[]
  matieres: Matiere[]
  classeIdInitiale?: string
  matiereIdInitiale?: string
  frequenceInitiale?: FrequenceCreneau
  frequenceForcee?: FrequenceCreneau
  referenceSemaineADefinie: boolean
  isEdition: boolean
  onCreerClasse: (nom: string, niveau: string) => Promise<Classe>
  onEnregistrer: (classeId: string, matiereId: string, frequence: FrequenceCreneau) => Promise<void>
  onSupprimer?: () => Promise<void>
  onClose: () => void
}

function CreneauModal({
  jourSemaine,
  heureDebut,
  classes,
  matieres,
  classeIdInitiale,
  matiereIdInitiale,
  frequenceInitiale,
  frequenceForcee,
  referenceSemaineADefinie,
  isEdition,
  onCreerClasse,
  onEnregistrer,
  onSupprimer,
  onClose,
}: CreneauModalProps) {
  const [classeId, setClasseId] = useState(classeIdInitiale ?? '')
  const [matiereId, setMatiereId] = useState(matiereIdInitiale ?? '')
  const [frequence, setFrequence] = useState<FrequenceCreneau>(
    frequenceForcee ?? frequenceInitiale ?? 'toutes_les_semaines',
  )
  const [nouvelleClasseNom, setNouvelleClasseNom] = useState('')
  const [nouvelleClasseNiveau, setNouvelleClasseNiveau] = useState('')
  const [saving, setSaving] = useState(false)

  const creationEnCours = classeId === NOUVELLE_CLASSE

  async function handleEnregistrer() {
    setSaving(true)
    try {
      let finalClasseId = classeId
      if (creationEnCours) {
        const nom = nouvelleClasseNom.trim()
        if (!nom) return
        const nouvelle = await onCreerClasse(nom, nouvelleClasseNiveau.trim())
        finalClasseId = nouvelle.id
      }
      if (!finalClasseId || !matiereId) return
      await onEnregistrer(finalClasseId, matiereId, frequence)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`${JOURS[jourSemaine]} ${heureDebut}`} onClose={onClose}>
      <label className="modal-field">
        Classe
        <select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
          <option value="" disabled>
            Choisir une classe
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
          <option value={NOUVELLE_CLASSE}>+ Nouvelle classe</option>
        </select>
      </label>

      {creationEnCours && (
        <div className="modal-field-group">
          <label className="modal-field">
            Nom de la classe
            <input
              type="text"
              value={nouvelleClasseNom}
              onChange={(e) => setNouvelleClasseNom(e.target.value)}
              placeholder="ex. 3ème A"
            />
          </label>
          <label className="modal-field">
            Niveau
            <input
              type="text"
              value={nouvelleClasseNiveau}
              onChange={(e) => setNouvelleClasseNiveau(e.target.value)}
              placeholder="ex. 3ème"
            />
          </label>
        </div>
      )}

      <label className="modal-field">
        Matière
        <select value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
          <option value="" disabled>
            Choisir une matière
          </option>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
      </label>

      {frequenceForcee ? (
        <div className="modal-field-hint">
          {frequenceForcee === 'semaine_a' ? 'Semaine A uniquement' : 'Semaine B uniquement'}
        </div>
      ) : (
        <label className="modal-field">
          Fréquence
          <select
            value={frequence}
            onChange={(e) => setFrequence(e.target.value as FrequenceCreneau)}
          >
            <option value="toutes_les_semaines">Toutes les semaines</option>
            <option value="semaine_a" disabled={!referenceSemaineADefinie}>
              Semaine A uniquement
            </option>
            <option value="semaine_b" disabled={!referenceSemaineADefinie}>
              Semaine B uniquement
            </option>
          </select>
          {!referenceSemaineADefinie && (
            <span className="modal-field-hint">
              Définis d'abord une date de référence pour la semaine A (bouton en haut de la page)
              pour utiliser l'alternance A/B.
            </span>
          )}
        </label>
      )}

      <div className="modal-actions">
        {isEdition && onSupprimer && (
          <button
            type="button"
            className="btn-sm btn-danger"
            onClick={async () => {
              await onSupprimer()
              onClose()
            }}
          >
            Supprimer
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-sm" onClick={onClose}>
          Annuler
        </button>
        <button
          type="button"
          className="btn-sm btn-primary"
          disabled={saving || !matiereId || (!creationEnCours && !classeId)}
          onClick={handleEnregistrer}
        >
          Enregistrer
        </button>
      </div>
    </Modal>
  )
}

export default CreneauModal
