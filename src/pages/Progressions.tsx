import { useEffect, useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useUnites } from '../hooks/useUnites'
import { useChapitres } from '../hooks/useChapitres'
import { useProgressions } from '../hooks/useProgressions'
import { useProgressionUnites } from '../hooks/useProgressionUnites'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useEmploiDuTemps } from '../hooks/useEmploiDuTemps'
import { usePlannings } from '../hooks/usePlannings'
import Modal from '../components/Modal'

function Progressions() {
  const { matieres } = useMatieres()
  const { unites } = useUnites()
  const { chapitres } = useChapitres()
  const { progressions, error, add, edit, remove } = useProgressions()
  const [matieresRepliees, setMatieresRepliees] = useState<Set<string>>(new Set())
  const [progressionSelectionneeId, setProgressionSelectionneeId] = useState<string | null>(null)

  const [nouvelleOuverte, setNouvelleOuverte] = useState(false)
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleMatiereId, setNouvelleMatiereId] = useState('')

  const [chapitreAAjouter, setChapitreAAjouter] = useState('')
  const [uniteAAjouter, setUniteAAjouter] = useState('')
  const [ajoutChapitreEnCours, setAjoutChapitreEnCours] = useState(false)
  const [ajoutUniteEnCours, setAjoutUniteEnCours] = useState(false)
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const [indexDrag, setIndexDrag] = useState<number | null>(null)
  const [indexSurvol, setIndexSurvol] = useState<number | null>(null)
  const [groupesDeplies, setGroupesDeplies] = useState<Set<string>>(new Set())

  const progressionSelectionnee =
    progressions.find((p) => p.id === progressionSelectionneeId) ?? null
  const {
    items,
    error: erreurItems,
    add: ajouterUnite,
    addChapitre: ajouterChapitre,
    remove: retirerUnite,
    reorder,
  } = useProgressionUnites(progressionSelectionnee?.id ?? null)

  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { creneaux } = useEmploiDuTemps(anneeActive?.id ?? null)
  const {
    plannings,
    error: erreurPlannings,
    generer: genererPlanningPourClasse,
    decharger: dechargerPlanningPourClasse,
  } = usePlannings(anneeActive?.id ?? null)
  const [generationEnCours, setGenerationEnCours] = useState<string | null>(null)
  const [dechargementEnCours, setDechargementEnCours] = useState<string | null>(null)
  const [resultatsGeneration, setResultatsGeneration] = useState<
    Record<string, { nbSeances: number; nbEvaluations: number; nbSeancesEnExces: number }>
  >({})

  const classesEligibles = useMemo(() => {
    if (!progressionSelectionnee) return []
    const classeIds = new Set(
      creneaux.filter((c) => c.matiere_id === progressionSelectionnee.matiere_id).map((c) => c.classe_id),
    )
    return classes.filter((c) => classeIds.has(c.id))
  }, [classes, creneaux, progressionSelectionnee])

  async function handleGenererPlanning(classeId: string) {
    if (!progressionSelectionnee || !anneeActive) return
    setGenerationEnCours(classeId)
    setErreurAjout(null)
    try {
      const resultat = await genererPlanningPourClasse(classeId, progressionSelectionnee, anneeActive)
      setResultatsGeneration((prev) => ({
        ...prev,
        [classeId]: {
          nbSeances: resultat.nbSeances,
          nbEvaluations: resultat.nbEvaluations,
          nbSeancesEnExces: resultat.nbSeancesEnExces,
        },
      }))
    } catch (err) {
      setErreurAjout(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerationEnCours(null)
    }
  }

  async function handleDechargerPlanning(planningId: string, classeId: string) {
    setDechargementEnCours(classeId)
    setErreurAjout(null)
    try {
      await dechargerPlanningPourClasse(planningId)
      setResultatsGeneration((prev) => {
        const { [classeId]: _retire, ...reste } = prev
        return reste
      })
    } catch (err) {
      setErreurAjout(err instanceof Error ? err.message : String(err))
    } finally {
      setDechargementEnCours(null)
    }
  }

  const groupes = useMemo(
    () =>
      matieres
        .map((matiere) => ({
          matiere,
          progressions: progressions.filter((p) => p.matiere_id === matiere.id),
        }))
        .filter((g) => g.progressions.length > 0),
    [matieres, progressions],
  )

  const dejaAjoutees = useMemo(() => new Set(items.map((i) => i.unite_id)), [items])

  // Regroupe les unités déjà dans la progression sous leur chapitre pour
  // l'affichage — par tranches contiguës selon l'ordre réel de la
  // progression (celui utilisé par le moteur de projection), jamais par un
  // tri global qui le trahirait. Deux passages non contigus par le même
  // chapitre (déplacement manuel) donnent donc deux groupes distincts.
  const groupesItems = useMemo(() => {
    const groupes: {
      cle: string
      chapitreId: string | null
      chapitreNom: string
      entrees: { item: (typeof items)[number]; index: number }[]
    }[] = []
    items.forEach((item, index) => {
      const chapitreId = item.unite.chapitre?.id ?? null
      const dernier = groupes[groupes.length - 1]
      if (dernier && dernier.chapitreId === chapitreId) {
        dernier.entrees.push({ item, index })
      } else {
        groupes.push({
          cle: `${chapitreId ?? 'sans-chapitre'}#${index}`,
          chapitreId,
          chapitreNom: item.unite.chapitre?.nom ?? 'Sans chapitre',
          entrees: [{ item, index }],
        })
      }
    })
    return groupes
  }, [items])

  useEffect(() => {
    setGroupesDeplies(new Set())
  }, [progressionSelectionneeId])

  function toggleGroupe(cle: string) {
    setGroupesDeplies((prev) => {
      const next = new Set(prev)
      if (next.has(cle)) next.delete(cle)
      else next.add(cle)
      return next
    })
  }

  // Unités de la matière de la progression, non encore présentes, regroupées
  // par chapitre et triées selon la trame par défaut (les unités sans
  // chapitre ne sont pas piochables via l'ajout de chapitre entier).
  const chapitresAvecUnitesDisponibles = useMemo(() => {
    if (!progressionSelectionnee) return []
    return chapitres
      .filter((c) => c.matiere_id === progressionSelectionnee.matiere_id)
      .map((chapitre) => {
        const unitesDisponibles = unites
          .filter((u) => u.chapitre_id === chapitre.id && !dejaAjoutees.has(u.id))
          .sort(
            (a, b) =>
              (a.ordre_interne_par_defaut ?? Number.MAX_SAFE_INTEGER) -
              (b.ordre_interne_par_defaut ?? Number.MAX_SAFE_INTEGER),
          )
        return { chapitre, unitesDisponibles }
      })
      .filter((g) => g.unitesDisponibles.length > 0)
  }, [chapitres, unites, progressionSelectionnee, dejaAjoutees])

  const chapitresActifs = chapitresAvecUnitesDisponibles.filter((g) => !g.chapitre.archive)
  const chapitresArchives = chapitresAvecUnitesDisponibles.filter((g) => g.chapitre.archive)

  const chapitresDeLaMatiere = useMemo(
    () =>
      progressionSelectionnee
        ? chapitres.filter((c) => c.matiere_id === progressionSelectionnee.matiere_id)
        : [],
    [chapitres, progressionSelectionnee],
  )

  const unitesDisponibles = useMemo(() => {
    if (!progressionSelectionnee) return []
    return unites.filter(
      (u) => u.matiere_id === progressionSelectionnee.matiere_id && !dejaAjoutees.has(u.id),
    )
  }, [unites, progressionSelectionnee, dejaAjoutees])

  useEffect(() => {
    if (chapitreAAjouter && !chapitresAvecUnitesDisponibles.some((g) => g.chapitre.id === chapitreAAjouter)) {
      setChapitreAAjouter('')
    }
  }, [chapitreAAjouter, chapitresAvecUnitesDisponibles])

  useEffect(() => {
    if (uniteAAjouter && !unitesDisponibles.some((u) => u.id === uniteAAjouter)) {
      setUniteAAjouter('')
    }
  }, [uniteAAjouter, unitesDisponibles])

  function toggleMatiere(id: string) {
    setMatieresRepliees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreer() {
    const nom = nouveauNom.trim()
    if (!nom || !nouvelleMatiereId) return
    const creee = await add(nom, nouvelleMatiereId)
    setProgressionSelectionneeId(creee.id)
    setNouveauNom('')
    setNouvelleMatiereId('')
    setNouvelleOuverte(false)
  }

  async function handleSupprimer(id: string) {
    const supprimee = await remove(id)
    if (supprimee && progressionSelectionneeId === id) setProgressionSelectionneeId(null)
  }

  async function handleAjouterChapitre() {
    const groupe = chapitresAvecUnitesDisponibles.find((g) => g.chapitre.id === chapitreAAjouter)
    if (!groupe) return
    setAjoutChapitreEnCours(true)
    setErreurAjout(null)
    try {
      await ajouterChapitre(groupe.unitesDisponibles.map((u) => u.id))
      setChapitreAAjouter('')
    } catch (err) {
      setErreurAjout(err instanceof Error ? err.message : String(err))
    } finally {
      setAjoutChapitreEnCours(false)
    }
  }

  async function handleAjouterUniteIsolee() {
    if (!uniteAAjouter) return
    setAjoutUniteEnCours(true)
    setErreurAjout(null)
    try {
      await ajouterUnite(uniteAAjouter)
      setUniteAAjouter('')
    } catch (err) {
      setErreurAjout(err instanceof Error ? err.message : String(err))
    } finally {
      setAjoutUniteEnCours(false)
    }
  }

  function handleDrop(indexCible: number) {
    if (indexDrag !== null && indexDrag !== indexCible) {
      const nouvelOrdre = [...items]
      const [deplace] = nouvelOrdre.splice(indexDrag, 1)
      nouvelOrdre.splice(indexCible, 0, deplace)
      reorder(nouvelOrdre)
    }
    setIndexDrag(null)
    setIndexSurvol(null)
  }

  const matiereSelectionnee = progressionSelectionnee
    ? matieres.find((m) => m.id === progressionSelectionnee.matiere_id)
    : null

  return (
    <div>
      <h2 className="section-title">Progressions</h2>
      <p className="section-desc">
        La temporalité : assemble des chapitres pour construire l'ordonnancement d'une matière.
        Ajouter un chapitre copie ses unités dans l'ordre de sa trame par défaut — réordonner,
        retirer ou ajouter une unité ici n'affecte jamais le chapitre d'origine ni les autres
        progressions.
      </p>

      {error && <p className="error-text">{error}</p>}
      {erreurItems && <p className="error-text">{erreurItems}</p>}
      {erreurAjout && <p className="error-text">{erreurAjout}</p>}

      <div className="progressions-layout">
        <div className="progressions-list">
          {groupes.map(({ matiere, progressions: progressionsMatiere }) => {
            const repliee = matieresRepliees.has(matiere.id)
            return (
              <div className="referentiel-group" key={matiere.id}>
                <button
                  type="button"
                  className="referentiel-group-header"
                  onClick={() => toggleMatiere(matiere.id)}
                >
                  <span className="referentiel-group-dot" style={{ background: matiere.couleur }} />
                  {matiere.nom}
                  <span className="referentiel-group-count">{progressionsMatiere.length}</span>
                  <span>{repliee ? '▸' : '▾'}</span>
                </button>
                {!repliee &&
                  progressionsMatiere.map((progression) => (
                    <div
                      key={progression.id}
                      className={`referentiel-unite-item${progression.id === progressionSelectionneeId ? ' selected' : ''}`}
                      onClick={() => setProgressionSelectionneeId(progression.id)}
                    >
                      {progression.nom}
                    </div>
                  ))}
              </div>
            )
          })}

          {groupes.length === 0 && (
            <p className="section-desc">Aucune progression pour le moment.</p>
          )}

          <button
            type="button"
            className="btn-sm btn-primary"
            onClick={() => setNouvelleOuverte(true)}
          >
            Nouvelle progression
          </button>
        </div>

        <div className="progressions-detail-col">
          {progressionSelectionnee ? (
            <div className="progression-detail" key={progressionSelectionnee.id}>
              <div className="progression-detail-header">
                <span
                  className="referentiel-group-dot"
                  style={{ background: matiereSelectionnee?.couleur }}
                />
                <input
                  type="text"
                  className="input-sm card-row-label"
                  defaultValue={progressionSelectionnee.nom}
                  onBlur={(e) => {
                    const nom = e.target.value.trim()
                    if (nom && nom !== progressionSelectionnee.nom) {
                      edit(progressionSelectionnee.id, { nom })
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-sm btn-danger"
                  onClick={() => handleSupprimer(progressionSelectionnee.id)}
                >
                  Supprimer
                </button>
              </div>

              {groupesItems.map((groupe) => {
                const deplie = groupesDeplies.has(groupe.cle)
                return (
                  <div className="referentiel-group" key={groupe.cle}>
                    <button
                      type="button"
                      className="referentiel-group-header"
                      onClick={() => toggleGroupe(groupe.cle)}
                    >
                      {groupe.chapitreNom}
                      <span className="referentiel-group-count">{groupe.entrees.length}</span>
                      <span>{deplie ? '▾' : '▸'}</span>
                    </button>
                    {deplie &&
                      groupe.entrees.map(({ item, index }) => (
                        <div
                          key={item.id}
                          className={`progression-unite-item${indexDrag === index ? ' dragging' : ''}${
                            indexSurvol === index ? ' drag-over' : ''
                          }`}
                          draggable
                          onDragStart={() => setIndexDrag(index)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setIndexSurvol(index)
                          }}
                          onDrop={() => handleDrop(index)}
                          onDragEnd={() => {
                            setIndexDrag(null)
                            setIndexSurvol(null)
                          }}
                        >
                          <span className="progression-unite-handle">⋮⋮</span>
                          <span className="progression-unite-position">{index + 1}.</span>
                          <span style={{ flex: 1 }}>{item.unite.titre}</span>
                          <button
                            type="button"
                            className="btn-sm btn-danger"
                            onClick={() => retirerUnite(item.id)}
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                  </div>
                )
              })}

              {items.length === 0 && (
                <p className="section-desc" style={{ margin: 0 }}>
                  Aucune unité dans cette progression pour l'instant.
                </p>
              )}

              <div className="progression-add-row">
                <select value={chapitreAAjouter} onChange={(e) => setChapitreAAjouter(e.target.value)}>
                  <option value="" disabled>
                    Ajouter un chapitre entier…
                  </option>
                  {chapitresActifs.length > 0 && (
                    <optgroup label="Chapitres">
                      {chapitresActifs.map(({ chapitre, unitesDisponibles }) => (
                        <option key={chapitre.id} value={chapitre.id}>
                          {chapitre.nom} ({unitesDisponibles.length})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {chapitresArchives.length > 0 && (
                    <optgroup label="Archives">
                      {chapitresArchives.map(({ chapitre, unitesDisponibles }) => (
                        <option key={chapitre.id} value={chapitre.id}>
                          {chapitre.nom} ({unitesDisponibles.length})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  type="button"
                  className="btn-sm btn-primary"
                  disabled={!chapitreAAjouter || ajoutChapitreEnCours}
                  onClick={handleAjouterChapitre}
                >
                  Ajouter
                </button>
              </div>

              {chapitresAvecUnitesDisponibles.length === 0 && (
                <p className="section-desc" style={{ margin: 0 }}>
                  {chapitresDeLaMatiere.length === 0
                    ? "Aucun chapitre pour cette matière — crée-en un dans l'onglet Chapitres."
                    : 'Tous les chapitres de cette matière sont soit vides, soit déjà entièrement ajoutés à cette progression.'}
                </p>
              )}

              <div className="progression-add-row">
                <select value={uniteAAjouter} onChange={(e) => setUniteAAjouter(e.target.value)}>
                  <option value="" disabled>
                    Ajouter une unité isolément…
                  </option>
                  {unitesDisponibles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.titre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-sm"
                  disabled={!uniteAAjouter || ajoutUniteEnCours}
                  onClick={handleAjouterUniteIsolee}
                >
                  Ajouter
                </button>
              </div>

              <h3 className="section-title" style={{ marginTop: '1.5rem' }}>
                Plannings {anneeActive ? `— ${anneeActive.libelle}` : ''}
              </h3>
              <p className="section-desc" style={{ margin: '0 0 0.5rem' }}>
                Décharger un planning supprime ses séances et évaluations de l'année pour cette
                classe (y compris celles déjà faites, notées ou imprimées) — irréversible.
              </p>
              {erreurPlannings && <p className="error-text">{erreurPlannings}</p>}
              {!anneeActive ? (
                <p className="section-desc" style={{ margin: 0 }}>
                  Aucune année scolaire active.
                </p>
              ) : classesEligibles.length === 0 ? (
                <p className="section-desc" style={{ margin: 0 }}>
                  Aucune classe n'a de créneau pour cette matière dans l'emploi du temps de l'année
                  active.
                </p>
              ) : (
                <div className="card">
                  {classesEligibles.map((classe) => {
                    const planningExistant = plannings.find(
                      (p) => p.classe_id === classe.id && p.progression_id === progressionSelectionnee.id,
                    )
                    const resultat = resultatsGeneration[classe.id]
                    return (
                      <div className="card-row" key={classe.id}>
                        <span className="card-row-label">{classe.nom}</span>
                        {resultat ? (
                          <span className="section-desc" style={{ margin: 0 }}>
                            {resultat.nbSeances} séance(s), {resultat.nbEvaluations} évaluation(s)
                            {resultat.nbSeancesEnExces > 0 && (
                              <span className="error-text"> — {resultat.nbSeancesEnExces} en excès</span>
                            )}
                          </span>
                        ) : planningExistant ? (
                          <span className="section-desc" style={{ margin: 0 }}>
                            Planning généré
                            {planningExistant.nb_seances_en_exces > 0 && (
                              <span className="error-text">
                                {' '}
                                — {planningExistant.nb_seances_en_exces} en excès
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="section-desc" style={{ margin: 0 }}>
                            Aucun planning
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          disabled={generationEnCours === classe.id || dechargementEnCours === classe.id}
                          onClick={() => handleGenererPlanning(classe.id)}
                        >
                          {generationEnCours === classe.id
                            ? 'Génération…'
                            : planningExistant
                              ? 'Régénérer'
                              : 'Générer'}
                        </button>
                        {planningExistant && (
                          <button
                            type="button"
                            className="btn-sm btn-danger"
                            disabled={generationEnCours === classe.id || dechargementEnCours === classe.id}
                            onClick={() => handleDechargerPlanning(planningExistant.id, classe.id)}
                          >
                            {dechargementEnCours === classe.id ? 'Déchargement…' : 'Décharger'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="referentiel-detail-empty">Sélectionne une progression à gauche.</div>
          )}
        </div>
      </div>

      {nouvelleOuverte && (
        <Modal title="Nouvelle progression" onClose={() => setNouvelleOuverte(false)}>
          <label className="modal-field">
            Nom
            <input
              type="text"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              placeholder="ex. Progression 3ème — Algèbre"
            />
          </label>
          <label className="modal-field">
            Matière
            <select
              value={nouvelleMatiereId}
              onChange={(e) => setNouvelleMatiereId(e.target.value)}
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
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-sm" onClick={() => setNouvelleOuverte(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              disabled={!nouveauNom.trim() || !nouvelleMatiereId}
              onClick={handleCreer}
            >
              Créer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Progressions
