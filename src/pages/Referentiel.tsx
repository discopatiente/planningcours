import { useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useUnites } from '../hooks/useUnites'
import Modal from '../components/Modal'
import type { Unite } from '../types/unite'

function parseJours(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function Referentiel() {
  const { matieres } = useMatieres()
  const { unites, loading, error, add, edit, remove, dupliquer } = useUnites()

  const [recherche, setRecherche] = useState('')
  const [matieresRepliees, setMatieresRepliees] = useState<Set<string>>(new Set())
  const [uniteSelectionneeId, setUniteSelectionneeId] = useState<string | null>(null)

  const [nouvelleUniteOuverte, setNouvelleUniteOuverte] = useState(false)
  const [nouveauTitre, setNouveauTitre] = useState('')
  const [nouvelleMatiereId, setNouvelleMatiereId] = useState('')

  const uniteSelectionnee = unites.find((u) => u.id === uniteSelectionneeId) ?? null

  const groupes = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    const filtrees = terme
      ? unites.filter((u) => u.titre.toLowerCase().includes(terme))
      : unites

    return matieres
      .map((matiere) => ({
        matiere,
        unites: filtrees.filter((u) => u.matiere_id === matiere.id),
      }))
      .filter((g) => g.unites.length > 0)
  }, [matieres, unites, recherche])

  function toggleMatiere(id: string) {
    setMatieresRepliees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreerUnite() {
    const titre = nouveauTitre.trim()
    if (!titre || !nouvelleMatiereId) return
    const creee = await add(titre, nouvelleMatiereId)
    setUniteSelectionneeId(creee.id)
    setNouveauTitre('')
    setNouvelleMatiereId('')
    setNouvelleUniteOuverte(false)
  }

  async function handleDupliquer(unite: Unite) {
    const copie = await dupliquer(unite)
    setUniteSelectionneeId(copie.id)
  }

  async function handleSupprimer(unite: Unite) {
    await remove(unite.id)
    if (uniteSelectionneeId === unite.id) setUniteSelectionneeId(null)
  }

  return (
    <div>
      <h2 className="section-title">Référentiel</h2>
      <p className="section-desc">
        Construis ton référentiel de cours réutilisable d'une année sur l'autre. Ces unités
        servent ensuite de base aux progressions et à la projection sur l'année scolaire.
      </p>

      {error && <p className="error-text">{error}</p>}

      {!loading && (
        <div className="referentiel-layout">
          <div className="referentiel-list">
            <input
              type="text"
              className="input-sm referentiel-search"
              placeholder="Rechercher une unité…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />

            {groupes.map(({ matiere, unites: unitesMatiere }) => {
              const repliee = matieresRepliees.has(matiere.id)
              return (
                <div className="referentiel-group" key={matiere.id}>
                  <button
                    type="button"
                    className="referentiel-group-header"
                    onClick={() => toggleMatiere(matiere.id)}
                  >
                    <span
                      className="referentiel-group-dot"
                      style={{ background: matiere.couleur }}
                    />
                    {matiere.nom}
                    <span className="referentiel-group-count">{unitesMatiere.length}</span>
                    <span>{repliee ? '▸' : '▾'}</span>
                  </button>
                  {!repliee &&
                    unitesMatiere.map((unite) => (
                      <div
                        key={unite.id}
                        className={`referentiel-unite-item${unite.id === uniteSelectionneeId ? ' selected' : ''}`}
                        onClick={() => setUniteSelectionneeId(unite.id)}
                      >
                        {unite.titre}
                      </div>
                    ))}
                </div>
              )
            })}

            {groupes.length === 0 && (
              <p className="section-desc">
                {recherche ? 'Aucune unité ne correspond à la recherche.' : 'Aucune unité pour le moment.'}
              </p>
            )}

            <button
              type="button"
              className="btn-sm btn-primary"
              onClick={() => setNouvelleUniteOuverte(true)}
            >
              Nouvelle unité
            </button>
          </div>

          {uniteSelectionnee ? (
            <div className="referentiel-detail" key={uniteSelectionnee.id}>
              <label className="modal-field">
                Titre
                <input
                  type="text"
                  defaultValue={uniteSelectionnee.titre}
                  onBlur={(e) => {
                    const titre = e.target.value.trim()
                    if (titre && titre !== uniteSelectionnee.titre) edit(uniteSelectionnee.id, { titre })
                  }}
                />
              </label>

              <label className="modal-field">
                Matière
                <select
                  value={uniteSelectionnee.matiere_id}
                  onChange={(e) => edit(uniteSelectionnee.id, { matiere_id: e.target.value })}
                >
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-field">
                Lien PDF
                <input
                  type="url"
                  defaultValue={uniteSelectionnee.lien_pdf ?? ''}
                  placeholder="https://…"
                  onBlur={(e) => {
                    const lien = e.target.value.trim()
                    if (lien !== (uniteSelectionnee.lien_pdf ?? '')) {
                      edit(uniteSelectionnee.id, { lien_pdf: lien || null })
                    }
                  }}
                />
                {uniteSelectionnee.lien_pdf && (
                  <a href={uniteSelectionnee.lien_pdf} target="_blank" rel="noreferrer">
                    Ouvrir le document
                  </a>
                )}
              </label>

              <div className="referentiel-detail-row">
                <label className="modal-field">
                  Délai d'impression (jours)
                  <input
                    type="number"
                    defaultValue={uniteSelectionnee.delai_impression_jours ?? ''}
                    onBlur={(e) => {
                      const valeur = parseJours(e.target.value)
                      if (valeur !== uniteSelectionnee.delai_impression_jours) {
                        edit(uniteSelectionnee.id, { delai_impression_jours: valeur })
                      }
                    }}
                  />
                </label>
                <label className="modal-field">
                  Délai de prévenance élèves (jours)
                  <input
                    type="number"
                    defaultValue={uniteSelectionnee.delai_eleves_jours ?? ''}
                    onBlur={(e) => {
                      const valeur = parseJours(e.target.value)
                      if (valeur !== uniteSelectionnee.delai_eleves_jours) {
                        edit(uniteSelectionnee.id, { delai_eleves_jours: valeur })
                      }
                    }}
                  />
                </label>
              </div>

              <label className="modal-field">
                Instruction élèves
                <textarea
                  rows={3}
                  defaultValue={uniteSelectionnee.instruction_eleves ?? ''}
                  onBlur={(e) => {
                    const valeur = e.target.value
                    if (valeur !== (uniteSelectionnee.instruction_eleves ?? '')) {
                      edit(uniteSelectionnee.id, { instruction_eleves: valeur || null })
                    }
                  }}
                />
              </label>

              <label className="modal-field">
                Notes
                <textarea
                  rows={3}
                  defaultValue={uniteSelectionnee.notes ?? ''}
                  onBlur={(e) => {
                    const valeur = e.target.value
                    if (valeur !== (uniteSelectionnee.notes ?? '')) {
                      edit(uniteSelectionnee.id, { notes: valeur || null })
                    }
                  }}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => handleDupliquer(uniteSelectionnee)}
                >
                  Dupliquer
                </button>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  className="btn-sm btn-danger"
                  onClick={() => handleSupprimer(uniteSelectionnee)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div className="referentiel-detail-empty">Sélectionne une unité à gauche.</div>
          )}
        </div>
      )}

      {nouvelleUniteOuverte && (
        <Modal title="Nouvelle unité" onClose={() => setNouvelleUniteOuverte(false)}>
          <label className="modal-field">
            Titre
            <input
              type="text"
              value={nouveauTitre}
              onChange={(e) => setNouveauTitre(e.target.value)}
              placeholder="ex. Le théorème de Pythagore"
            />
          </label>
          <label className="modal-field">
            Matière
            <select value={nouvelleMatiereId} onChange={(e) => setNouvelleMatiereId(e.target.value)}>
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
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn-sm"
              onClick={() => setNouvelleUniteOuverte(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              disabled={!nouveauTitre.trim() || !nouvelleMatiereId}
              onClick={handleCreerUnite}
            >
              Créer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Referentiel
