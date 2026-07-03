import { Fragment, useMemo, useState } from 'react'
import { useAnneesScolaires } from '../../hooks/useAnneesScolaires'
import { useClasses } from '../../hooks/useClasses'
import { useMatieres } from '../../hooks/useMatieres'
import { useEmploiDuTemps } from '../../hooks/useEmploiDuTemps'
import Modal from '../../components/Modal'
import CreneauModal from '../../components/CreneauModal'
import type { Creneau, FrequenceCreneau } from '../../types/creneau'
import { calculerSemaine } from '../../lib/semaineAB'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const HEURES = [
  '08:00:00',
  '09:00:00',
  '10:00:00',
  '11:00:00',
  '12:00:00',
  '13:00:00',
  '14:00:00',
  '15:00:00',
  '16:00:00',
  '17:00:00',
]

function formatHeure(heure: string) {
  return `${parseInt(heure, 10)}h`
}

function EmploiDuTemps() {
  const {
    annees,
    loading: anneesLoading,
    add: ajouterAnnee,
    activer,
    definirReferenceSemaineA,
  } = useAnneesScolaires()
  const { classes, add: ajouterClasse } = useClasses()
  const { matieres } = useMatieres()

  const anneeActive = annees.find((a) => a.active) ?? null
  const { creneaux, assigner, modifier, supprimer, copierDepuis } = useEmploiDuTemps(
    anneeActive?.id ?? null,
  )

  const anneePrecedente = useMemo(() => {
    if (!anneeActive) return null
    return (
      annees
        .filter((a) => a.date_debut < anneeActive.date_debut)
        .sort((a, b) => (a.date_debut < b.date_debut ? 1 : -1))[0] ?? null
    )
  }, [annees, anneeActive])

  const [creneauSelectionne, setCreneauSelectionne] = useState<{
    jourSemaine: number
    heureDebut: string
    existant: Creneau | null
    frequenceForcee?: FrequenceCreneau
  } | null>(null)
  const [nouvelleAnneeOuverte, setNouvelleAnneeOuverte] = useState(false)
  const [libelle, setLibelle] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  function creneauxPour(jourSemaine: number, heureDebut: string) {
    return creneaux.filter((c) => c.jour_semaine === jourSemaine && c.heure_debut === heureDebut)
  }

  function classeNom(id: string) {
    return classes.find((c) => c.id === id)?.nom ?? '?'
  }

  function matiereInfo(id: string) {
    return matieres.find((m) => m.id === id)
  }

  async function handleCreerAnnee() {
    if (!libelle.trim() || !dateDebut || !dateFin) return
    await ajouterAnnee(libelle.trim(), dateDebut, dateFin)
    setLibelle('')
    setDateDebut('')
    setDateFin('')
    setNouvelleAnneeOuverte(false)
  }

  return (
    <div>
      <h2 className="section-title">Emploi du temps {anneeActive?.libelle ?? ''}</h2>
      <p className="section-desc">
        Définis tes créneaux de cours pour chaque jour de la semaine. Clique sur une case pour y
        affecter une classe et une matière. Cet emploi du temps sera utilisé comme base pour
        toutes les projections de l'année.
      </p>

      <div className="emploi-toolbar">
        {anneePrecedente && (
          <button
            type="button"
            className="btn-sm btn-primary"
            onClick={() => copierDepuis(anneePrecedente.id)}
          >
            Copier depuis {anneePrecedente.libelle}
          </button>
        )}
        <label className="emploi-toolbar-field">
          Référence semaine A :
          <input
            type="date"
            className="input-sm"
            value={anneeActive?.reference_semaine_a_date ?? ''}
            onChange={(e) =>
              anneeActive && definirReferenceSemaineA(anneeActive.id, e.target.value || null)
            }
          />
          {anneeActive?.reference_semaine_a_date && (
            <span className="modal-field-hint">
              Aujourd'hui : semaine{' '}
              {calculerSemaine(new Date().toISOString().slice(0, 10), anneeActive.reference_semaine_a_date)}
            </span>
          )}
        </label>
        <div style={{ flex: 1 }} />
        <span className="section-desc" style={{ margin: 0 }}>
          Année active :
        </span>
        <select
          className="input-sm"
          value={anneeActive?.id ?? ''}
          onChange={(e) => activer(e.target.value)}
        >
          {annees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-sm btn-primary"
          onClick={() => setNouvelleAnneeOuverte(true)}
        >
          Nouvelle année
        </button>
      </div>

      {!anneesLoading && !anneeActive && (
        <p className="section-desc">
          Aucune année scolaire — clique sur "Nouvelle année" pour commencer.
        </p>
      )}

      {anneeActive && (
        <div className="emploi-grid">
          <div className="eg-cell eg-header" />
          {JOURS.map((jour) => (
            <div className="eg-cell eg-header" key={jour}>
              {jour}
            </div>
          ))}

          {HEURES.map((heure) => (
            <Fragment key={heure}>
              <div className="eg-cell eg-time">{formatHeure(heure)}</div>
              {JOURS.map((_, jourSemaine) => {
                const creneauxCell = creneauxPour(jourSemaine, heure)
                const toutesLesSemaines = creneauxCell.find(
                  (c) => c.frequence === 'toutes_les_semaines',
                )
                const entreeA = creneauxCell.find((c) => c.frequence === 'semaine_a')
                const entreeB = creneauxCell.find((c) => c.frequence === 'semaine_b')

                if (toutesLesSemaines) {
                  const matiere = matiereInfo(toutesLesSemaines.matiere_id)
                  return (
                    <div
                      key={`${jourSemaine}-${heure}`}
                      className="eg-cell eg-slot filled"
                      style={matiere ? { background: `${matiere.couleur}33` } : undefined}
                      onClick={() =>
                        setCreneauSelectionne({
                          jourSemaine,
                          heureDebut: heure,
                          existant: toutesLesSemaines,
                        })
                      }
                    >
                      {classeNom(toutesLesSemaines.classe_id)}
                      <br />
                      {matiere?.nom}
                    </div>
                  )
                }

                if (entreeA || entreeB) {
                  return (
                    <div className="eg-cell eg-slot-split" key={`${jourSemaine}-${heure}`}>
                      {(['semaine_a', 'semaine_b'] as const).map((freq) => {
                        const entree = freq === 'semaine_a' ? entreeA : entreeB
                        const matiere = entree ? matiereInfo(entree.matiere_id) : undefined
                        return (
                          <div
                            key={freq}
                            className={`eg-slot-half${entree ? ' filled' : ''}`}
                            style={
                              entree && matiere ? { background: `${matiere.couleur}33` } : undefined
                            }
                            onClick={() =>
                              setCreneauSelectionne({
                                jourSemaine,
                                heureDebut: heure,
                                existant: entree ?? null,
                                frequenceForcee: freq,
                              })
                            }
                          >
                            <span className="semaine-badge">
                              {freq === 'semaine_a' ? 'A' : 'B'}
                            </span>
                            {entree ? (
                              <>
                                {' '}
                                {classeNom(entree.classe_id)} · {matiere?.nom}
                              </>
                            ) : (
                              ' +'
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <div
                    key={`${jourSemaine}-${heure}`}
                    className="eg-cell eg-slot"
                    onClick={() =>
                      setCreneauSelectionne({
                        jourSemaine,
                        heureDebut: heure,
                        existant: null,
                      })
                    }
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      )}

      <div className="section-desc">
        Clique sur une case vide pour ajouter un créneau · Clique sur un créneau existant pour le
        modifier ou le supprimer
      </div>

      {creneauSelectionne && (
        <CreneauModal
          jourSemaine={creneauSelectionne.jourSemaine}
          heureDebut={creneauSelectionne.heureDebut}
          classes={classes}
          matieres={matieres}
          classeIdInitiale={creneauSelectionne.existant?.classe_id}
          matiereIdInitiale={creneauSelectionne.existant?.matiere_id}
          frequenceInitiale={creneauSelectionne.existant?.frequence}
          frequenceForcee={creneauSelectionne.frequenceForcee}
          referenceSemaineADefinie={!!anneeActive?.reference_semaine_a_date}
          isEdition={!!creneauSelectionne.existant}
          onCreerClasse={ajouterClasse}
          onEnregistrer={async (classeId, matiereId, frequence) => {
            if (creneauSelectionne.existant) {
              await modifier(creneauSelectionne.existant.id, classeId, matiereId, frequence)
            } else {
              await assigner(
                creneauSelectionne.jourSemaine,
                creneauSelectionne.heureDebut,
                classeId,
                matiereId,
                frequence,
              )
            }
          }}
          onSupprimer={
            creneauSelectionne.existant
              ? () => supprimer(creneauSelectionne.existant!.id)
              : undefined
          }
          onClose={() => setCreneauSelectionne(null)}
        />
      )}

      {nouvelleAnneeOuverte && (
        <Modal title="Nouvelle année scolaire" onClose={() => setNouvelleAnneeOuverte(false)}>
          <label className="modal-field">
            Libellé
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex. 2026-2027"
            />
          </label>
          <label className="modal-field">
            Date de début
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </label>
          <label className="modal-field">
            Date de fin
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </label>
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn-sm"
              onClick={() => setNouvelleAnneeOuverte(false)}
            >
              Annuler
            </button>
            <button type="button" className="btn-sm btn-primary" onClick={handleCreerAnnee}>
              Créer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default EmploiDuTemps
