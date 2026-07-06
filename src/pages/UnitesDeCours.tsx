import { useEffect, useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useChapitres } from '../hooks/useChapitres'
import { useUnites } from '../hooks/useUnites'
import { useRessources } from '../hooks/useRessources'
import Modal from '../components/Modal'
import type { Unite } from '../types/unite'
import type { TypeRessource } from '../types/ressource'

const LIBELLES_TYPE_RESSOURCE: Record<TypeRessource, string> = {
  support: 'Support de cours',
  video: 'Vidéo',
  exercice: 'Exercice',
  devoir_possible: 'Devoir possible',
  lien_utile: 'Lien utile',
}

function parseJours(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function UnitesDeCours() {
  const { matieres } = useMatieres()
  const { chapitres, error: erreurChapitres } = useChapitres()
  const {
    unites,
    loading: unitesLoading,
    error: erreurUnites,
    add: ajouterUnite,
    edit: editerUnite,
    remove: supprimerUnite,
    dupliquer,
    assignerChapitre,
    reorderDansChapitre,
  } = useUnites()

  const [recherche, setRecherche] = useState('')
  const [matieresRepliees, setMatieresRepliees] = useState<Set<string>>(new Set())

  const [uniteSelectionneeId, setUniteSelectionneeId] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<'contenu' | 'instances'>('contenu')

  const [dragUnite, setDragUnite] = useState<{ groupeId: string; index: number } | null>(null)
  const [survolUnite, setSurvolUnite] = useState<{ groupeId: string; index: number } | null>(null)

  const [nouvelleUniteOuverte, setNouvelleUniteOuverte] = useState(false)
  const [nouveauTitreUnite, setNouveauTitreUnite] = useState('')
  const [nouvelleMatiereIdUnite, setNouvelleMatiereIdUnite] = useState('')
  const [nouveauChapitreIdUnite, setNouveauChapitreIdUnite] = useState('')

  const [nouvelleRessourceOuverte, setNouvelleRessourceOuverte] = useState(false)
  const [nouveauTypeRessource, setNouveauTypeRessource] = useState<TypeRessource>('support')
  const [nouveauLibelleRessource, setNouveauLibelleRessource] = useState('')
  const [nouvelleUrlRessource, setNouvelleUrlRessource] = useState('')
  const [indexDragRessource, setIndexDragRessource] = useState<number | null>(null)
  const [indexSurvolRessource, setIndexSurvolRessource] = useState<number | null>(null)

  const uniteSelectionnee = unites.find((u) => u.id === uniteSelectionneeId) ?? null
  const {
    ressources,
    error: erreurRessources,
    add: ajouterRessource,
    edit: editerRessource,
    remove: supprimerRessource,
    reorder: reordonnerRessources,
  } = useRessources(uniteSelectionneeId)

  // Regroupement en lecture seule pour l'affichage : matière → chapitres (avec
  // leurs unités dans l'ordre de la trame par défaut) → unités sans chapitre.
  // Les chapitres eux-mêmes ne sont ni créés ni édités ici (onglet Chapitres).
  const groupesParMatiere = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    return matieres
      .map((matiere) => {
        const unitesMatiere = unites.filter(
          (u) => u.matiere_id === matiere.id && (!terme || u.titre.toLowerCase().includes(terme)),
        )
        const chapitresMatiere = chapitres
          .filter((c) => c.matiere_id === matiere.id)
          .map((chapitre) => ({
            chapitre,
            unites: unitesMatiere
              .filter((u) => u.chapitre_id === chapitre.id)
              .sort(
                (a, b) =>
                  (a.ordre_interne_par_defaut ?? Number.MAX_SAFE_INTEGER) -
                  (b.ordre_interne_par_defaut ?? Number.MAX_SAFE_INTEGER),
              ),
          }))
          .filter((g) => g.unites.length > 0)
        const sansChapitre = unitesMatiere
          .filter((u) => !u.chapitre_id)
          .sort((a, b) => a.titre.localeCompare(b.titre))
        return { matiere, chapitresMatiere, sansChapitre }
      })
      .filter((g) => g.chapitresMatiere.length > 0 || g.sansChapitre.length > 0)
  }, [matieres, chapitres, unites, recherche])

  const chapitresDeLaMatiereUniteSelectionnee = useMemo(
    () =>
      uniteSelectionnee
        ? chapitres.filter((c) => c.matiere_id === uniteSelectionnee.matiere_id)
        : [],
    [chapitres, uniteSelectionnee],
  )
  const chapitresActifsUniteSelectionnee = chapitresDeLaMatiereUniteSelectionnee.filter(
    (c) => !c.archive,
  )
  const chapitresArchivesUniteSelectionnee = chapitresDeLaMatiereUniteSelectionnee.filter(
    (c) => c.archive,
  )

  const chapitresPourNouvelleUnite = useMemo(
    () => chapitres.filter((c) => c.matiere_id === nouvelleMatiereIdUnite),
    [chapitres, nouvelleMatiereIdUnite],
  )

  useEffect(() => {
    if (uniteSelectionneeId && !unites.some((u) => u.id === uniteSelectionneeId)) {
      setUniteSelectionneeId(null)
    }
  }, [uniteSelectionneeId, unites])

  function toggleMatiere(id: string) {
    setMatieresRepliees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function ouvrirNouvelleUnite() {
    setNouveauTitreUnite('')
    setNouvelleMatiereIdUnite('')
    setNouveauChapitreIdUnite('')
    setNouvelleUniteOuverte(true)
  }

  async function handleCreerUnite() {
    const titre = nouveauTitreUnite.trim()
    if (!titre || !nouvelleMatiereIdUnite) return
    const creee = await ajouterUnite(titre, nouvelleMatiereIdUnite)
    if (nouveauChapitreIdUnite) await assignerChapitre(creee.id, nouveauChapitreIdUnite)
    setUniteSelectionneeId(creee.id)
    setOnglet('contenu')
    setNouvelleUniteOuverte(false)
  }

  async function handleDupliquer(unite: Unite) {
    const copie = await dupliquer(unite)
    setUniteSelectionneeId(copie.id)
  }

  async function handleSupprimerUnite(unite: Unite) {
    await supprimerUnite(unite.id)
    if (uniteSelectionneeId === unite.id) setUniteSelectionneeId(null)
  }

  async function handleMatiereChange(unite: Unite, matiereId: string) {
    await editerUnite(unite.id, { matiere_id: matiereId })
    const chapitreActuel = chapitres.find((c) => c.id === unite.chapitre_id)
    if (chapitreActuel && chapitreActuel.matiere_id !== matiereId) {
      await assignerChapitre(unite.id, null)
    }
  }

  function handleChapitreChange(unite: Unite, value: string) {
    assignerChapitre(unite.id, value || null)
  }

  function handleDropUnite(groupeId: string, unitesDuGroupe: Unite[], indexCible: number) {
    if (dragUnite && dragUnite.groupeId === groupeId && dragUnite.index !== indexCible) {
      const nouvelOrdre = [...unitesDuGroupe]
      const [deplace] = nouvelOrdre.splice(dragUnite.index, 1)
      nouvelOrdre.splice(indexCible, 0, deplace)
      reorderDansChapitre(groupeId, nouvelOrdre.map((u) => u.id))
    }
    setDragUnite(null)
    setSurvolUnite(null)
  }

  async function handleCreerRessource() {
    const url = nouvelleUrlRessource.trim()
    if (!url) return
    await ajouterRessource(nouveauTypeRessource, url, nouveauLibelleRessource.trim() || null)
    setNouveauLibelleRessource('')
    setNouvelleUrlRessource('')
    setNouveauTypeRessource('support')
    setNouvelleRessourceOuverte(false)
  }

  function handleDropRessource(indexCible: number) {
    if (indexDragRessource !== null && indexDragRessource !== indexCible) {
      const nouvelOrdre = [...ressources]
      const [deplace] = nouvelOrdre.splice(indexDragRessource, 1)
      nouvelOrdre.splice(indexCible, 0, deplace)
      reordonnerRessources(nouvelOrdre)
    }
    setIndexDragRessource(null)
    setIndexSurvolRessource(null)
  }

  return (
    <div>
      <h2 className="section-title">Unités de cours</h2>
      <p className="section-desc">
        Crée et paramètre les unités de cours. Elles sont affichées regroupées par chapitre — la
        gestion des chapitres eux-mêmes (création, archivage, suppression) se fait dans l'onglet
        Chapitres.
      </p>

      {erreurChapitres && <p className="error-text">{erreurChapitres}</p>}
      {erreurUnites && <p className="error-text">{erreurUnites}</p>}

      {!unitesLoading && (
        <div className="referentiel-layout">
          <div className="referentiel-list">
            <input
              type="text"
              className="input-sm referentiel-search"
              placeholder="Rechercher une unité…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />

            {groupesParMatiere.map(({ matiere, chapitresMatiere, sansChapitre }) => {
              const repliee = matieresRepliees.has(matiere.id)
              const total =
                chapitresMatiere.reduce((n, g) => n + g.unites.length, 0) + sansChapitre.length
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
                    <span className="referentiel-group-count">{total}</span>
                    <span>{repliee ? '▸' : '▾'}</span>
                  </button>
                  {!repliee && (
                    <>
                      {chapitresMatiere.map(({ chapitre, unites: unitesChapitre }) => (
                        <div key={chapitre.id}>
                          <div className="udc-chapitre-label">
                            {chapitre.nom}
                            {chapitre.archive ? ' (archivé)' : ''}
                          </div>
                          {unitesChapitre.map((unite, index) => (
                            <div
                              key={unite.id}
                              className={`udc-unite-item${
                                dragUnite?.groupeId === chapitre.id && dragUnite.index === index
                                  ? ' dragging'
                                  : ''
                              }${
                                survolUnite?.groupeId === chapitre.id && survolUnite.index === index
                                  ? ' drag-over'
                                  : ''
                              }${unite.id === uniteSelectionneeId ? ' selected' : ''}`}
                              draggable
                              onDragStart={() => setDragUnite({ groupeId: chapitre.id, index })}
                              onDragOver={(e) => {
                                e.preventDefault()
                                setSurvolUnite({ groupeId: chapitre.id, index })
                              }}
                              onDrop={() => handleDropUnite(chapitre.id, unitesChapitre, index)}
                              onDragEnd={() => {
                                setDragUnite(null)
                                setSurvolUnite(null)
                              }}
                              onClick={() => {
                                setUniteSelectionneeId(unite.id)
                                setOnglet('contenu')
                              }}
                            >
                              <span className="progression-unite-handle">⋮⋮</span>
                              <span style={{ flex: 1 }}>{unite.titre}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {sansChapitre.length > 0 && (
                        <div>
                          <div className="udc-chapitre-label" style={{ fontStyle: 'italic' }}>
                            Sans chapitre
                          </div>
                          {sansChapitre.map((unite) => (
                            <div
                              key={unite.id}
                              className={`udc-unite-item${unite.id === uniteSelectionneeId ? ' selected' : ''}`}
                              onClick={() => {
                                setUniteSelectionneeId(unite.id)
                                setOnglet('contenu')
                              }}
                            >
                              <span style={{ flex: 1 }}>{unite.titre}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {groupesParMatiere.length === 0 && (
              <p className="section-desc">
                {recherche ? 'Aucune unité ne correspond à la recherche.' : 'Aucune unité pour le moment.'}
              </p>
            )}

            <button type="button" className="btn-sm btn-primary" onClick={ouvrirNouvelleUnite}>
              Nouvelle unité
            </button>
          </div>

          {uniteSelectionnee ? (
            <div className="referentiel-detail" key={uniteSelectionnee.id}>
              <div className="udc-tabs">
                <button
                  type="button"
                  className={`udc-tab${onglet === 'contenu' ? ' active' : ''}`}
                  onClick={() => setOnglet('contenu')}
                >
                  Contenu
                </button>
                <button
                  type="button"
                  className={`udc-tab${onglet === 'instances' ? ' active' : ''}`}
                  onClick={() => setOnglet('instances')}
                >
                  Instances
                </button>
              </div>

              {onglet === 'contenu' ? (
                <>
                  <label className="modal-field">
                    Titre
                    <input
                      type="text"
                      defaultValue={uniteSelectionnee.titre}
                      onBlur={(e) => {
                        const titre = e.target.value.trim()
                        if (titre && titre !== uniteSelectionnee.titre) {
                          editerUnite(uniteSelectionnee.id, { titre })
                        }
                      }}
                    />
                  </label>

                  <label className="modal-field">
                    Matière
                    <select
                      value={uniteSelectionnee.matiere_id}
                      onChange={(e) => handleMatiereChange(uniteSelectionnee, e.target.value)}
                    >
                      {matieres.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nom}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="modal-field">
                    Chapitre
                    <select
                      value={uniteSelectionnee.chapitre_id ?? ''}
                      onChange={(e) => handleChapitreChange(uniteSelectionnee, e.target.value)}
                    >
                      <option value="">Sans chapitre</option>
                      {chapitresActifsUniteSelectionnee.length > 0 && (
                        <optgroup label="Chapitres">
                          {chapitresActifsUniteSelectionnee.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {chapitresArchivesUniteSelectionnee.length > 0 && (
                        <optgroup label="Archives">
                          {chapitresArchivesUniteSelectionnee.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
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
                            editerUnite(uniteSelectionnee.id, { delai_impression_jours: valeur })
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
                            editerUnite(uniteSelectionnee.id, { delai_eleves_jours: valeur })
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
                          editerUnite(uniteSelectionnee.id, { instruction_eleves: valeur || null })
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
                          editerUnite(uniteSelectionnee.id, { notes: valeur || null })
                        }
                      }}
                    />
                  </label>

                  <div className="modal-field">
                    Ressources
                    {erreurRessources && <p className="error-text">{erreurRessources}</p>}
                    <div className="udc-ressources">
                      {ressources.map((ressource, index) => (
                        <div
                          key={ressource.id}
                          className={`ressource-item${indexDragRessource === index ? ' dragging' : ''}${
                            indexSurvolRessource === index ? ' drag-over' : ''
                          }`}
                          draggable
                          onDragStart={() => setIndexDragRessource(index)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setIndexSurvolRessource(index)
                          }}
                          onDrop={() => handleDropRessource(index)}
                          onDragEnd={() => {
                            setIndexDragRessource(null)
                            setIndexSurvolRessource(null)
                          }}
                        >
                          <span className="progression-unite-handle">⋮⋮</span>
                          <select
                            className="ressource-type-select"
                            value={ressource.type}
                            onChange={(e) =>
                              editerRessource(ressource.id, { type: e.target.value as TypeRessource })
                            }
                          >
                            {Object.entries(LIBELLES_TYPE_RESSOURCE).map(([valeur, libelle]) => (
                              <option key={valeur} value={valeur}>
                                {libelle}
                              </option>
                            ))}
                          </select>
                          <div className="ressource-fields">
                            <input
                              type="text"
                              placeholder="Libellé (optionnel)"
                              defaultValue={ressource.libelle ?? ''}
                              onBlur={(e) => {
                                const libelle = e.target.value.trim()
                                if (libelle !== (ressource.libelle ?? '')) {
                                  editerRessource(ressource.id, { libelle: libelle || null })
                                }
                              }}
                            />
                            <input
                              type="url"
                              placeholder="https://…"
                              defaultValue={ressource.url}
                              onBlur={(e) => {
                                const url = e.target.value.trim()
                                if (url && url !== ressource.url) {
                                  editerRessource(ressource.id, { url })
                                }
                              }}
                            />
                          </div>
                          <a href={ressource.url} target="_blank" rel="noreferrer" title="Ouvrir">
                            ↗
                          </a>
                          <button
                            type="button"
                            className="btn-sm btn-danger"
                            onClick={() => supprimerRessource(ressource.id)}
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                      {ressources.length === 0 && (
                        <p className="section-desc" style={{ margin: 0 }}>
                          Aucune ressource pour cette unité.
                        </p>
                      )}
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => setNouvelleRessourceOuverte(true)}
                      >
                        + Ajouter une ressource
                      </button>
                    </div>
                  </div>

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
                      onClick={() => handleSupprimerUnite(uniteSelectionnee)}
                    >
                      Supprimer
                    </button>
                  </div>
                </>
              ) : (
                <p className="section-desc">
                  Aucune instance pour le moment — le moteur de projection (planning annuel) n'est
                  pas encore construit. Cette unité n'est utilisée dans aucun planning de classe.
                </p>
              )}
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
              value={nouveauTitreUnite}
              onChange={(e) => setNouveauTitreUnite(e.target.value)}
              placeholder="ex. Le théorème de Pythagore"
              autoFocus
            />
          </label>
          <label className="modal-field">
            Matière
            <select
              value={nouvelleMatiereIdUnite}
              onChange={(e) => {
                setNouvelleMatiereIdUnite(e.target.value)
                setNouveauChapitreIdUnite('')
              }}
            >
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
          <label className="modal-field">
            Chapitre (optionnel)
            <select
              value={nouveauChapitreIdUnite}
              onChange={(e) => setNouveauChapitreIdUnite(e.target.value)}
              disabled={!nouvelleMatiereIdUnite}
            >
              <option value="">Sans chapitre</option>
              {chapitresPourNouvelleUnite.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                  {c.archive ? ' (archivé)' : ''}
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
              disabled={!nouveauTitreUnite.trim() || !nouvelleMatiereIdUnite}
              onClick={handleCreerUnite}
            >
              Créer
            </button>
          </div>
        </Modal>
      )}

      {nouvelleRessourceOuverte && (
        <Modal title="Nouvelle ressource" onClose={() => setNouvelleRessourceOuverte(false)}>
          <label className="modal-field">
            Type
            <select
              value={nouveauTypeRessource}
              onChange={(e) => setNouveauTypeRessource(e.target.value as TypeRessource)}
            >
              {Object.entries(LIBELLES_TYPE_RESSOURCE).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field">
            Libellé (optionnel)
            <input
              type="text"
              value={nouveauLibelleRessource}
              onChange={(e) => setNouveauLibelleRessource(e.target.value)}
            />
          </label>
          <label className="modal-field">
            URL
            <input
              type="url"
              value={nouvelleUrlRessource}
              onChange={(e) => setNouvelleUrlRessource(e.target.value)}
              placeholder="https://…"
              autoFocus
            />
          </label>
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn-sm"
              onClick={() => setNouvelleRessourceOuverte(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              disabled={!nouvelleUrlRessource.trim()}
              onClick={handleCreerRessource}
            >
              Créer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default UnitesDeCours
