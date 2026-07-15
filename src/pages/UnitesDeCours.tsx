import { Fragment, useEffect, useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useChapitres } from '../hooks/useChapitres'
import { useUnites } from '../hooks/useUnites'
import { useRessources } from '../hooks/useRessources'
import { useRessourcesToutes } from '../hooks/useRessourcesToutes'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useInstancesUnite } from '../hooks/useInstancesUnite'
import Modal from '../components/Modal'
import { LIBELLES_TYPE_RESSOURCE } from '../lib/ressources'
import { importerUnites, parseCsvUnites, type ResultatImportUnites, type SeparateurCsv } from '../lib/importUnites'
import { messageErreur } from '../lib/erreurs'
import type { Unite } from '../types/unite'
import type { TypeRessource } from '../types/ressource'

// Valeur de filtre pour les unités sans chapitre — les id de chapitre sont
// des uuid, cette chaîne ne peut jamais entrer en collision avec un vrai id.
const SANS_CHAPITRE = '__sans_chapitre__'

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
  const [filtreMatiereId, setFiltreMatiereId] = useState('')
  const [filtreChapitreId, setFiltreChapitreId] = useState('')

  const [uniteSelectionneeId, setUniteSelectionneeId] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<'contenu' | 'instances'>('contenu')

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [survolIndex, setSurvolIndex] = useState<number | null>(null)

  const [nouvelleUniteOuverte, setNouvelleUniteOuverte] = useState(false)
  const [nouveauTitreUnite, setNouveauTitreUnite] = useState('')
  const [nouvelleMatiereIdUnite, setNouvelleMatiereIdUnite] = useState('')
  const [nouveauChapitreIdUnite, setNouveauChapitreIdUnite] = useState('')

  const [importOuvert, setImportOuvert] = useState(false)
  const [fichierImport, setFichierImport] = useState<File | null>(null)
  const [separateurImport, setSeparateurImport] = useState<SeparateurCsv>('auto')
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

  const { ressources: ressourcesToutes } = useRessourcesToutes()

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

  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const chapitresParId = useMemo(() => new Map(chapitres.map((c) => [c.id, c])), [chapitres])
  const ressourcesParUnite = useMemo(() => {
    const compte = new Map<string, number>()
    for (const r of ressourcesToutes) compte.set(r.unite_id, (compte.get(r.unite_id) ?? 0) + 1)
    return compte
  }, [ressourcesToutes])

  // Le réordonnancement par glisser-déposer n'a de sens que sur la trame
  // d'un seul chapitre — actif seulement quand le filtre en isole un.
  const dragReorderActif = filtreChapitreId !== '' && filtreChapitreId !== SANS_CHAPITRE

  const chapitresPourFiltre = useMemo(
    () => chapitres.filter((c) => c.matiere_id === filtreMatiereId),
    [chapitres, filtreMatiereId],
  )
  const chapitresActifsPourFiltre = chapitresPourFiltre.filter((c) => !c.archive)
  const chapitresArchivesPourFiltre = chapitresPourFiltre.filter((c) => c.archive)

  const unitesAffichees = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    let liste = unites.filter((u) => !terme || u.titre.toLowerCase().includes(terme))
    if (filtreMatiereId) liste = liste.filter((u) => u.matiere_id === filtreMatiereId)
    if (filtreChapitreId === SANS_CHAPITRE) liste = liste.filter((u) => !u.chapitre_id)
    else if (filtreChapitreId) liste = liste.filter((u) => u.chapitre_id === filtreChapitreId)

    if (dragReorderActif) {
      return [...liste].sort(
        (a, b) =>
          (a.ordre_interne_par_defaut ?? Number.MAX_SAFE_INTEGER) -
          (b.ordre_interne_par_defaut ?? Number.MAX_SAFE_INTEGER),
      )
    }
    return [...liste].sort((a, b) => {
      const matiereA = matieresParId.get(a.matiere_id)?.nom ?? ''
      const matiereB = matieresParId.get(b.matiere_id)?.nom ?? ''
      if (matiereA !== matiereB) return matiereA.localeCompare(matiereB)
      const chapitreA = a.chapitre_id ? (chapitresParId.get(a.chapitre_id)?.nom ?? '') : '\uffff'
      const chapitreB = b.chapitre_id ? (chapitresParId.get(b.chapitre_id)?.nom ?? '') : '\uffff'
      if (chapitreA !== chapitreB) return chapitreA.localeCompare(chapitreB)
      return a.titre.localeCompare(b.titre)
    })
  }, [unites, recherche, filtreMatiereId, filtreChapitreId, dragReorderActif, matieresParId, chapitresParId])

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
    setSeparateurImport('auto')
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
      const { lignes, erreurEntete } = parseCsvUnites(contenu, separateurImport)
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

  function handleDropUnite(indexCible: number) {
    if (dragReorderActif && dragIndex !== null && dragIndex !== indexCible) {
      const nouvelOrdre = [...unitesAffichees]
      const [deplace] = nouvelOrdre.splice(dragIndex, 1)
      nouvelOrdre.splice(indexCible, 0, deplace)
      reorderDansChapitre(filtreChapitreId, nouvelOrdre.map((u) => u.id))
    }
    setDragIndex(null)
    setSurvolIndex(null)
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
        Crée et paramètre les unités de cours. Filtre par matière et par chapitre pour retrouver
        rapidement une unité, puis clique une ligne pour la déplier. La gestion des chapitres
        eux-mêmes (création, archivage, suppression) se fait dans l'onglet Chapitres.
      </p>

      {erreurChapitres && <p className="error-text">{erreurChapitres}</p>}
      {erreurUnites && <p className="error-text">{erreurUnites}</p>}

      {!unitesLoading && (
        <div className="udc-table-page">
          <div className="udc-table-toolbar">
            <div className="udc-table-filters">
              <select
                className="input-sm"
                value={filtreMatiereId}
                onChange={(e) => {
                  setFiltreMatiereId(e.target.value)
                  setFiltreChapitreId('')
                }}
              >
                <option value="">Toutes les matières</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
              <select
                className="input-sm"
                value={filtreChapitreId}
                onChange={(e) => setFiltreChapitreId(e.target.value)}
                disabled={!filtreMatiereId}
              >
                <option value="">Tous les chapitres</option>
                <option value={SANS_CHAPITRE}>Sans chapitre</option>
                {chapitresActifsPourFiltre.length > 0 && (
                  <optgroup label="Chapitres">
                    {chapitresActifsPourFiltre.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </optgroup>
                )}
                {chapitresArchivesPourFiltre.length > 0 && (
                  <optgroup label="Archives">
                    {chapitresArchivesPourFiltre.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <input
                type="text"
                className="input-sm referentiel-search"
                placeholder="Rechercher une unité…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>

            <div className="udc-list-actions">
              <button type="button" className="btn-sm btn-primary" onClick={ouvrirNouvelleUnite}>
                Nouvelle unité
              </button>
              <button type="button" className="btn-sm" onClick={ouvrirImport}>
                Importer CSV
              </button>
            </div>
          </div>

          {unitesAffichees.length === 0 ? (
            <p className="section-desc">
              {unites.length === 0
                ? 'Aucune unité pour le moment.'
                : 'Aucune unité ne correspond aux filtres.'}
            </p>
          ) : (
            <div className="udc-table-wrap">
              <table className="udc-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Matière</th>
                    <th>Chapitre</th>
                    <th>Ressources</th>
                  </tr>
                </thead>
                <tbody>
                  {unitesAffichees.map((unite, index) => {
                    const estOuverte = unite.id === uniteSelectionneeId
                    const matiereUnite = matieresParId.get(unite.matiere_id)
                    const chapitreUnite = unite.chapitre_id
                      ? chapitresParId.get(unite.chapitre_id)
                      : undefined
                    const nbRessources = ressourcesParUnite.get(unite.id) ?? 0
                    return (
                      <Fragment key={unite.id}>
                        <tr
                          className={`udc-table-row${estOuverte ? ' expanded' : ''}${
                            dragReorderActif && dragIndex === index ? ' dragging' : ''
                          }${dragReorderActif && survolIndex === index ? ' drag-over' : ''}`}
                          draggable={dragReorderActif}
                          onDragStart={() => dragReorderActif && setDragIndex(index)}
                          onDragOver={(e) => {
                            if (!dragReorderActif) return
                            e.preventDefault()
                            setSurvolIndex(index)
                          }}
                          onDrop={() => dragReorderActif && handleDropUnite(index)}
                          onDragEnd={() => {
                            setDragIndex(null)
                            setSurvolIndex(null)
                          }}
                          onClick={() => {
                            setUniteSelectionneeId(estOuverte ? null : unite.id)
                            setOnglet('contenu')
                          }}
                        >
                          <td className="udc-table-titre">
                            {dragReorderActif && (
                              <span className="progression-unite-handle">⋮⋮</span>
                            )}
                            <span className="udc-table-chevron">{estOuverte ? '▾' : '▸'}</span>
                            {unite.titre}
                          </td>
                          <td>
                            {matiereUnite && (
                              <span
                                className="referentiel-group-dot"
                                style={{ background: matiereUnite.couleur }}
                              />
                            )}{' '}
                            {matiereUnite?.nom ?? '?'}
                          </td>
                          <td>
                            {chapitreUnite
                              ? `${chapitreUnite.nom}${chapitreUnite.archive ? ' (archivé)' : ''}`
                              : 'Sans chapitre'}
                          </td>
                          <td>{nbRessources}</td>
                        </tr>
                        {estOuverte && (
                          <tr className="udc-table-detail-row">
                            <td colSpan={4}>
                              <div className="udc-table-detail">
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
                                        defaultValue={unite.titre}
                                        onBlur={(e) => {
                                          const titre = e.target.value.trim()
                                          if (titre && titre !== unite.titre) {
                                            editerUnite(unite.id, { titre })
                                          }
                                        }}
                                      />
                                    </label>

                                    <label className="modal-field">
                                      Matière
                                      <select
                                        value={unite.matiere_id}
                                        onChange={(e) => handleMatiereChange(unite, e.target.value)}
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
                                        value={unite.chapitre_id ?? ''}
                                        onChange={(e) => handleChapitreChange(unite, e.target.value)}
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
                                          defaultValue={unite.delai_impression_jours ?? ''}
                                          onBlur={(e) => {
                                            const valeur = parseJours(e.target.value)
                                            if (valeur !== unite.delai_impression_jours) {
                                              editerUnite(unite.id, { delai_impression_jours: valeur })
                                            }
                                          }}
                                        />
                                      </label>
                                      <label className="modal-field">
                                        Délai de prévenance élèves (jours)
                                        <input
                                          type="number"
                                          defaultValue={unite.delai_eleves_jours ?? ''}
                                          onBlur={(e) => {
                                            const valeur = parseJours(e.target.value)
                                            if (valeur !== unite.delai_eleves_jours) {
                                              editerUnite(unite.id, { delai_eleves_jours: valeur })
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>

                                    <label className="modal-field">
                                      Instruction élèves
                                      <textarea
                                        rows={3}
                                        defaultValue={unite.instruction_eleves ?? ''}
                                        onBlur={(e) => {
                                          const valeur = e.target.value
                                          if (valeur !== (unite.instruction_eleves ?? '')) {
                                            editerUnite(unite.id, { instruction_eleves: valeur || null })
                                          }
                                        }}
                                      />
                                    </label>

                                    <label className="modal-field">
                                      Notes
                                      <textarea
                                        rows={3}
                                        defaultValue={unite.notes ?? ''}
                                        onBlur={(e) => {
                                          const valeur = e.target.value
                                          if (valeur !== (unite.notes ?? '')) {
                                            editerUnite(unite.id, { notes: valeur || null })
                                          }
                                        }}
                                      />
                                    </label>

                                    <div className="modal-field">
                                      Ressources
                                      {erreurRessources && <p className="error-text">{erreurRessources}</p>}
                                      <div className="udc-ressources">
                                        {ressources.map((ressource, indexRessource) => (
                                          <div
                                            key={ressource.id}
                                            className={`ressource-item${indexDragRessource === indexRessource ? ' dragging' : ''}${
                                              indexSurvolRessource === indexRessource ? ' drag-over' : ''
                                            }`}
                                            draggable
                                            onDragStart={() => setIndexDragRessource(indexRessource)}
                                            onDragOver={(e) => {
                                              e.preventDefault()
                                              setIndexSurvolRessource(indexRessource)
                                            }}
                                            onDrop={() => handleDropRessource(indexRessource)}
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
                                                editerRessource(ressource.id, {
                                                  type: e.target.value as TypeRessource,
                                                })
                                              }
                                            >
                                              {Object.entries(LIBELLES_TYPE_RESSOURCE).map(
                                                ([valeur, libelle]) => (
                                                  <option key={valeur} value={valeur}>
                                                    {libelle}
                                                  </option>
                                                ),
                                              )}
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
                                        onClick={() => handleDupliquer(unite)}
                                      >
                                        Dupliquer
                                      </button>
                                      <div style={{ flex: 1 }} />
                                      <button
                                        type="button"
                                        className="btn-sm btn-danger"
                                        onClick={() => handleSupprimerUnite(unite)}
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="udc-instances">
                                    <p className="section-desc">
                                      Classes utilisant cette unité dans leur planning de l'année active.
                                      Pousser resynchronise le titre, l'instruction élèves et les délais de
                                      préparation avec le template — sans jamais toucher aux dates, heures ou
                                      statuts des séances déjà programmées.
                                    </p>

                                    {erreurInstances && <p className="error-text">{erreurInstances}</p>}

                                    {!anneeActive ? (
                                      <p className="section-desc">Aucune année scolaire active.</p>
                                    ) : (
                                      !instancesLoading &&
                                      (classesInstances.length === 0 ? (
                                        <p className="section-desc">
                                          Cette unité n'est utilisée dans aucun planning de classe cette
                                          année.
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
                                            {classesInstances.map(
                                              ({ classe, classeId, nbSeances, aOverride }) => (
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
                                                    {nbSeances} séance(s)
                                                    {aOverride ? ' · modifiée(s) localement' : ''}
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
                                              ),
                                            )}
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
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
            (facultative — ajoutée comme support de cours). Séparateur point-virgule ou virgule,
            première ligne = en-têtes. Une matière inconnue bloque la ligne ; un chapitre inconnu
            est créé automatiquement dans la matière correspondante.
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
          <label className="modal-field">
            Séparateur
            <select
              value={separateurImport}
              onChange={(e) => setSeparateurImport(e.target.value as SeparateurCsv)}
            >
              <option value="auto">Détection automatique</option>
              <option value=";">Point-virgule ( ; )</option>
              <option value=",">Virgule ( , )</option>
            </select>
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
