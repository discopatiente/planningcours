import { useEffect, useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useChapitres } from '../hooks/useChapitres'
import { useUnites } from '../hooks/useUnites'
import { useRessources } from '../hooks/useRessources'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useInstancesUnite } from '../hooks/useInstancesUnite'
import Modal from '../components/Modal'
import { LIBELLES_TYPE_RESSOURCE } from '../lib/ressources'
import { importerUnites, parseCsvUnites, type ResultatImportUnites } from '../lib/importUnites'
import { messageErreur } from '../lib/erreurs'
import type { Unite } from '../types/unite'
import type { TypeRessource } from '../types/ressource'

function parseJours(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function UnitesDeCours() {
  const { matieres } = useMatieres()
  const { chapitres, error: erreurChapitres, reload: reloadChapitres } = useChapitres()
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
    reload: reloadUnites,
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

  const [importOuvert, setImportOuvert] = useState(false)
  const [fichierImport, setFichierImport] = useState<File | null>(null)
  const [importEnCours, setImportEnCours] = useState(false)
  const [erreurImport, setErreurImport] = useState<string | null>(null)
  const [resultatImport, setResultatImport] = useState<ResultatImportUnites | null>(null)

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

  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const {
    instances,
    loading: instancesLoading,
    error: erreurInstances,
    pousser,
  } = useInstancesUnite(uniteSelectionneeId, anneeActive?.id ?? null)
  const [classesCochees, setClassesCochees] = useState<Set<string>>(new Set())
  const [pushEnCours, setPushEnCours] = useState(false)
  const [messagePush, setMessagePush] = useState<string | null>(null)

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

  useEffect(() => {
    setClassesCochees(new Set())
    setMessagePush(null)
  }, [uniteSelectionneeId])

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])

  const classesInstances = useMemo(() => {
    const parClasse = new Map<string, { nbSeances: number; aOverride: boolean }>()
    for (const instance of instances) {
      const entree = parClasse.get(instance.classeId) ?? { nbSeances: 0, aOverride: false }
      entree.nbSeances += 1
      entree.aOverride = entree.aOverride || instance.aOverride
      parClasse.set(instance.classeId, entree)
    }
    return [...parClasse.entries()]
      .map(([classeId, info]) => ({ classe: classesParId.get(classeId), classeId, ...info }))
      .sort((a, b) => (a.classe?.nom ?? '').localeCompare(b.classe?.nom ?? ''))
  }, [instances, classesParId])

  function toggleClasseCochee(classeId: string) {
    setClassesCochees((prev) => {
      const next = new Set(prev)
      if (next.has(classeId)) next.delete(classeId)
      else next.add(classeId)
      return next
    })
  }

  function toggleToutesClasses() {
    setClassesCochees((prev) =>
      prev.size === classesInstances.length ? new Set() : new Set(classesInstances.map((c) => c.classeId)),
    )
  }

  async function handlePousser(classeIds: string[]) {
    if (classeIds.length === 0) return
    setPushEnCours(true)
    setMessagePush(null)
    try {
      const nb = await pousser(classeIds)
      setMessagePush(nb > 0 ? `${nb} séance(s) resynchronisée(s) avec le template.` : 'Rien à pousser — déjà synchronisé.')
      setClassesCochees(new Set())
    } finally {
      setPushEnCours(false)
    }
  }

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

  function ouvrirImport() {
    setFichierImport(null)
    setErreurImport(null)
    setResultatImport(null)
    setImportOuvert(true)
  }

  async function handleImporterCsv() {
    if (!fichierImport) return
    setImportEnCours(true)
    setErreurImport(null)
    setResultatImport(null)
    try {
      const contenu = await fichierImport.text()
      const { lignes, erreurEntete } = parseCsvUnites(contenu)
      if (erreurEntete) {
        setErreurImport(erreurEntete)
        return
      }
      const resultat = await importerUnites(lignes, matieres, chapitres)
      setResultatImport(resultat)
      await Promise.all([reloadUnites(), reloadChapitres()])
    } catch (err) {
      setErreurImport(messageErreur(err))
    } finally {
      setImportEnCours(false)
    }
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

            <div className="udc-list-actions">
              <button type="button" className="btn-sm btn-primary" onClick={ouvrirNouvelleUnite}>
                Nouvelle unité
              </button>
              <button type="button" className="btn-sm" onClick={ouvrirImport}>
                Importer CSV
              </button>
            </div>
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
                <div className="udc-instances">
                  <p className="section-desc">
                    Classes utilisant cette unité dans leur planning de l'année active. Pousser
                    resynchronise le titre, l'instruction élèves et les délais de préparation avec le
                    template — sans jamais toucher aux dates, heures ou statuts des séances déjà
                    programmées.
                  </p>

                  {erreurInstances && <p className="error-text">{erreurInstances}</p>}

                  {!anneeActive ? (
                    <p className="section-desc">Aucune année scolaire active.</p>
                  ) : (
                    !instancesLoading &&
                    (classesInstances.length === 0 ? (
                      <p className="section-desc">
                        Cette unité n'est utilisée dans aucun planning de classe cette année.
                      </p>
                    ) : (
                      <>
                        <label className="modal-field-inline">
                          <input
                            type="checkbox"
                            checked={classesCochees.size === classesInstances.length}
                            onChange={toggleToutesClasses}
                          />
                          Tout sélectionner
                        </label>

                        <ul className="udc-instances-liste">
                          {classesInstances.map(({ classe, classeId, nbSeances, aOverride }) => (
                            <li key={classeId} className="udc-instance-item">
                              <label className="modal-field-inline">
                                <input
                                  type="checkbox"
                                  checked={classesCochees.has(classeId)}
                                  onChange={() => toggleClasseCochee(classeId)}
                                />
                                {classe?.nom ?? '?'}
                              </label>
                              <span className="udc-instance-info">
                                {nbSeances} séance(s){aOverride ? ' · modifiée(s) localement' : ''}
                              </span>
                              <button
                                type="button"
                                className="btn-sm"
                                disabled={pushEnCours}
                                onClick={() => handlePousser([classeId])}
                              >
                                Pousser
                              </button>
                            </li>
                          ))}
                        </ul>

                        <div className="modal-actions">
                          <div style={{ flex: 1 }} />
                          <button
                            type="button"
                            className="btn-sm btn-primary"
                            disabled={pushEnCours || classesCochees.size === 0}
                            onClick={() => handlePousser([...classesCochees])}
                          >
                            Pousser vers la sélection ({classesCochees.size})
                          </button>
                        </div>

                        {messagePush && <p className="section-desc">{messagePush}</p>}
                      </>
                    ))
                  )}
                </div>
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

      {importOuvert && (
        <Modal title="Importer des unités (CSV)" onClose={() => setImportOuvert(false)}>
          <p className="section-desc">
            Une ligne = une unité. Colonnes attendues : Titre, Matière, Chapitre, Lien ressource
            (facultative — ajoutée comme support de cours). Séparateur point-virgule, première
            ligne = en-têtes. Une matière inconnue bloque la ligne ; un chapitre inconnu est créé
            automatiquement dans la matière correspondante.
          </p>
          <label className="modal-field">
            Fichier CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFichierImport(e.target.files?.[0] ?? null)
                setErreurImport(null)
                setResultatImport(null)
              }}
            />
          </label>
          {erreurImport && <p className="error-text">{erreurImport}</p>}
          {resultatImport && (
            <div className="section-desc">
              <p>{resultatImport.unitesCreees} unité(s) créée(s).</p>
              {resultatImport.chapitresCrees.length > 0 && (
                <p>Chapitre(s) créé(s) : {resultatImport.chapitresCrees.join(', ')}</p>
              )}
              {resultatImport.erreurs.length > 0 && (
                <>
                  <p className="error-text">
                    {resultatImport.erreurs.length} ligne(s) ignorée(s) :
                  </p>
                  <ul>
                    {resultatImport.erreurs.map((e) => (
                      <li key={e.numeroLigne} className="error-text">
                        Ligne {e.numeroLigne} : {e.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-sm" onClick={() => setImportOuvert(false)}>
              Fermer
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              disabled={!fichierImport || importEnCours}
              onClick={handleImporterCsv}
            >
              {importEnCours ? 'Import en cours…' : 'Importer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default UnitesDeCours
