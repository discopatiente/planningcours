import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useUnites } from '../hooks/useUnites'
import { useRessourcesToutes } from '../hooks/useRessourcesToutes'
import { useSemaine } from '../hooks/useSemaine'
import { usePlannings } from '../hooks/usePlannings'
import { useParametres } from '../hooks/useParametres'
import { useImpressions } from '../hooks/useImpressions'
import { calculerSemaine, lundiDeLaSemaine } from '../lib/semaineAB'
import { ajouterJours, parseISODate, toISODate } from '../lib/dates'
import { updateSeance } from '../lib/seances'
import { annulerSeance, ajouterSeanceExceptionnelle, deplacerSeance } from '../lib/seanceActions'
import { reporterEvaluation } from '../lib/evaluationActions'
import { calculerAlertesDistribution, calculerAlertesImpression, calculerAlertesInstructionsEleves } from '../lib/alertes'
import { TYPES_RESSOURCES_IMPRIMABLES } from '../lib/impressions'
import SeancePanel from '../components/SeancePanel'
import SeanceExceptionnelleModal from '../components/SeanceExceptionnelleModal'
import AlertesPreparation from '../components/AlertesPreparation'
import type { Ressource } from '../types/ressource'
import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'

const NOMS_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

// Grille de la sous-vue Calendrier : mêmes heures que la grille de l'emploi
// du temps (Paramètres), pour rester cohérent avec les créneaux qu'on peut y
// créer.
const HEURES_GRILLE = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
const HAUTEUR_LIGNE = 56
const HAUTEUR_ENTETE = 32

type ItemJour =
  | { kind: 'seance'; heure: string; data: SeanceAvecPlanning }
  | { kind: 'evaluation'; heure: string; data: EvaluationAvecPlanning }

function formatJour(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatPlageSemaine(lundi: string, vendredi: string) {
  const d1 = new Date(`${lundi}T00:00:00`)
  const d2 = new Date(`${vendredi}T00:00:00`)
  const debut = d1.toLocaleDateString('fr-FR', { day: 'numeric', month: d1.getMonth() === d2.getMonth() ? undefined : 'long' })
  const fin = d2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${debut} – ${fin}`
}

function formatHeure(heure: string) {
  return heure.slice(0, 5)
}

function Semaine() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { ressources } = useRessourcesToutes()
  const { parametres } = useParametres()
  const { etats: etatsImpressions } = useImpressions()

  const [vue, setVue] = useState<'liste' | 'calendrier'>('liste')
  const [dateReference, setDateReference] = useState(() => toISODate(new Date()))
  const lundi = toISODate(lundiDeLaSemaine(dateReference))
  const jours = useMemo(
    () => Array.from({ length: 5 }, (_, i) => toISODate(ajouterJours(parseISODate(lundi), i))),
    [lundi],
  )
  const vendredi = jours[4]
  const aujourdhui = toISODate(new Date())

  const [heureActuelle, setHeureActuelle] = useState(() => new Date())
  useEffect(() => {
    if (vue !== 'calendrier') return
    const intervalle = setInterval(() => setHeureActuelle(new Date()), 30_000)
    return () => clearInterval(intervalle)
  }, [vue])

  const {
    seances,
    seancesFenetreAlertes,
    evaluations,
    loading,
    error,
    reload,
    marquerSeanceFaite,
    marquerEvaluationFaite,
  } = useSemaine(anneeActive?.id ?? null, lundi, vendredi)
  const { plannings } = usePlannings(anneeActive?.id ?? null)

  const [itemSelectionne, setItemSelectionne] = useState<ItemJour | null>(null)
  const [modalExceptionnelleOuvert, setModalExceptionnelleOuvert] = useState(false)

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])

  const ressourcePrincipaleParUnite = useMemo(() => {
    const map = new Map<string, Ressource>()
    for (const r of ressources) {
      const existante = map.get(r.unite_id)
      if (!existante || (existante.type !== 'support' && r.type === 'support')) {
        map.set(r.unite_id, r)
      }
    }
    return map
  }, [ressources])

  const ressourcesImprimablesParUnite = useMemo(() => {
    const map = new Map<string, Ressource[]>()
    for (const r of ressources) {
      if (!TYPES_RESSOURCES_IMPRIMABLES.includes(r.type)) continue
      const liste = map.get(r.unite_id) ?? []
      liste.push(r)
      map.set(r.unite_id, liste)
    }
    return map
  }, [ressources])

  const alertesImpression = useMemo(
    () =>
      calculerAlertesImpression(
        seancesFenetreAlertes,
        unitesParId,
        lundi,
        vendredi,
        ressourcesImprimablesParUnite,
        etatsImpressions,
      ).map((a) => ({
        id: a.seance.id,
        dateSeance: a.seance.date,
        titre: a.titre,
        classeNom: classesParId.get(a.seance.planning.classe_id)?.nom ?? '?',
        ressourceUrl: a.seance.unite_id ? ressourcePrincipaleParUnite.get(a.seance.unite_id)?.url : undefined,
      })),
    [
      seancesFenetreAlertes,
      unitesParId,
      lundi,
      vendredi,
      classesParId,
      ressourcePrincipaleParUnite,
      ressourcesImprimablesParUnite,
      etatsImpressions,
    ],
  )

  const alertesDistribution = useMemo(
    () =>
      calculerAlertesDistribution(
        seances,
        unitesParId,
        ressourcesImprimablesParUnite,
        etatsImpressions,
        lundi,
        vendredi,
      ).map((a) => ({
        id: a.seance.id,
        dateSeance: a.seance.date,
        titre: a.titre,
        classeNom: classesParId.get(a.seance.planning.classe_id)?.nom ?? '?',
      })),
    [seances, unitesParId, ressourcesImprimablesParUnite, etatsImpressions, lundi, vendredi, classesParId],
  )

  const alertesInstructions = useMemo(
    () =>
      calculerAlertesInstructionsEleves(seancesFenetreAlertes, unitesParId, lundi, vendredi).map((a) => ({
        id: a.seance.id,
        dateSeance: a.seance.date,
        titre: a.titre,
        classeNom: classesParId.get(a.seance.planning.classe_id)?.nom ?? '?',
        instruction: a.instruction,
      })),
    [seancesFenetreAlertes, unitesParId, lundi, vendredi, classesParId],
  )

  function matiereDeProgression(progressionId: string) {
    const progression = progressionsParId.get(progressionId)
    return progression ? matieresParId.get(progression.matiere_id) ?? null : null
  }

  const itemsParJour = useMemo(() => {
    const map = new Map<string, ItemJour[]>()
    for (const jour of jours) map.set(jour, [])
    for (const s of seances) {
      map.get(s.date)?.push({ kind: 'seance', heure: s.heure_debut, data: s })
    }
    for (const e of evaluations) {
      map.get(e.date)?.push({ kind: 'evaluation', heure: e.heure_debut, data: e })
    }
    for (const items of map.values()) items.sort((a, b) => a.heure.localeCompare(b.heure))
    return map
  }, [jours, seances, evaluations])

  function detailsItem(item: ItemJour) {
    const classe = classesParId.get(item.data.planning.classe_id)
    const matiere = matiereDeProgression(item.data.planning.progression_id)
    const estEvaluation = item.kind === 'evaluation'
    const seanceAnnuleeSansUnite =
      !estEvaluation && item.data.statut === 'annulee' && (item.data as SeanceAvecPlanning).unite_id === null
    const titre = estEvaluation
      ? (item.data as EvaluationAvecPlanning).titre ?? 'Évaluation'
      : seanceAnnuleeSansUnite
        ? 'Séance annulée'
        : (item.data as SeanceAvecPlanning).override_titre ??
          unitesParId.get((item.data as SeanceAvecPlanning).unite_id ?? '')?.titre ??
          '(unité supprimée)'
    const ressource = !estEvaluation
      ? ressourcePrincipaleParUnite.get((item.data as SeanceAvecPlanning).unite_id ?? '')
      : undefined
    return { classe, matiere, estEvaluation, titre, ressource }
  }

  function toggleFait(item: ItemJour, fait: boolean) {
    if (item.kind === 'evaluation') marquerEvaluationFaite(item.data.id, fait)
    else marquerSeanceFaite(item.data.id, fait)
  }

  const optionsExceptionnelle = useMemo(
    () =>
      plannings
        .map((planning) => {
          const classe = classesParId.get(planning.classe_id)
          const progression = progressionsParId.get(planning.progression_id)
          if (!classe || !progression) return null
          const matiere = matieresParId.get(progression.matiere_id) ?? null
          return { planning, classe, progression, matiere }
        })
        .filter((o): o is NonNullable<typeof o> => o !== null),
    [plannings, classesParId, progressionsParId, matieresParId],
  )

  async function handleAnnuler(item: ItemJour, motif: string | null) {
    if (!anneeActive) return
    if (item.kind === 'evaluation') {
      if (!parametres) return
      const evaluation = item.data
      const matiere = matiereDeProgression(evaluation.planning.progression_id)
      if (!matiere) return
      await reporterEvaluation(
        evaluation,
        evaluation.planning.classe_id,
        matiere.id,
        matiere.max_evaluations_exclu,
        anneeActive,
        parametres.max_evaluations_semaine,
      )
      await reload()
      return
    }
    const seance = item.data
    const matiere = matiereDeProgression(seance.planning.progression_id)
    if (!matiere) return
    await annulerSeance(seance, motif, seance.planning.classe_id, matiere.id, anneeActive)
    await reload()
  }

  async function handleDeplacer(item: ItemJour, date: string, heureDebut: string) {
    if (item.kind === 'evaluation') return
    await deplacerSeance(item.data.id, date, heureDebut)
    await reload()
  }

  async function handleEnregistrerNote(item: ItemJour, notes: string) {
    if (item.kind === 'evaluation') return
    await updateSeance(item.data.id, { notes_seance: notes || null })
    await reload()
  }

  async function handleAjouterExceptionnelle(planningId: string, progressionId: string, date: string, heureDebut: string) {
    await ajouterSeanceExceptionnelle(planningId, progressionId, date, heureDebut)
    await reload()
  }

  const aujourdhuiDansLaSemaine = jours.includes(aujourdhui)
  const decimaleActuelle = heureActuelle.getHours() + heureActuelle.getMinutes() / 60
  const ligneActuelleVisible =
    aujourdhuiDansLaSemaine && decimaleActuelle >= HEURES_GRILLE[0] && decimaleActuelle < HEURES_GRILLE[HEURES_GRILLE.length - 1] + 1
  const offsetLigneActuelle = HAUTEUR_ENTETE + (decimaleActuelle - HEURES_GRILLE[0]) * HAUTEUR_LIGNE

  return (
    <div>
      <h2 className="section-title">Semaine</h2>

      <div className="semaine-toolbar">
        <button type="button" className="btn-sm" onClick={() => setDateReference(toISODate(ajouterJours(parseISODate(lundi), -7)))}>
          ◂ Précédente
        </button>
        <button type="button" className="btn-sm" onClick={() => setDateReference(toISODate(new Date()))}>
          Aujourd'hui
        </button>
        <button type="button" className="btn-sm" onClick={() => setDateReference(toISODate(ajouterJours(parseISODate(lundi), 7)))}>
          Suivante ▸
        </button>
        <span className="semaine-plage">
          {formatPlageSemaine(lundi, vendredi)}
          {anneeActive && (
            <span className="semaine-badge">{calculerSemaine(lundi, anneeActive.reference_semaine_a_date) ?? '?'}</span>
          )}
        </span>
        <div style={{ flex: 1 }} />
        {optionsExceptionnelle.length > 0 && (
          <button type="button" className="btn-sm" onClick={() => setModalExceptionnelleOuvert(true)}>
            + Séance exceptionnelle
          </button>
        )}
        <div className="semaine-vue-toggle">
          <button
            type="button"
            className={`btn-sm${vue === 'liste' ? ' btn-primary' : ''}`}
            onClick={() => setVue('liste')}
          >
            Liste
          </button>
          <button
            type="button"
            className={`btn-sm${vue === 'calendrier' ? ' btn-primary' : ''}`}
            onClick={() => setVue('calendrier')}
          >
            Calendrier
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading &&
        (vue === 'liste' ? (
          <div className="semaine-jours-wrapper">
            <AlertesPreparation
              impressions={alertesImpression}
              distributions={alertesDistribution}
              instructions={alertesInstructions}
            />
            <div className="semaine-jours">
            {jours.map((jour, index) => (
              <div className="semaine-jour" key={jour}>
                <div className={`semaine-jour-header${jour === aujourdhui ? ' aujourdhui' : ''}`}>
                  {NOMS_JOURS[index]} <span className="semaine-jour-date">{formatJour(jour)}</span>
                </div>

                {itemsParJour.get(jour)?.length === 0 && <p className="semaine-jour-vide">Aucun cours</p>}

                {itemsParJour.get(jour)?.map((item) => {
                  const { classe, matiere, estEvaluation, titre, ressource } = detailsItem(item)
                  const passee = jour < aujourdhui

                  return (
                    <div
                      key={item.data.id}
                      className={`semaine-item${estEvaluation ? ' semaine-item-evaluation' : ''}${passee ? ' semaine-item-passee' : ''}`}
                      onClick={() => setItemSelectionne(item)}
                    >
                      <span className="semaine-item-heure">{formatHeure(item.heure)}</span>
                      <span className="referentiel-group-dot" style={{ background: matiere?.couleur ?? '#999' }} />
                      <span className="semaine-item-corps">
                        <span className="semaine-item-titre">{titre}</span>
                        <span className="semaine-item-classe">
                          {classe?.nom ?? '?'} — {matiere?.nom ?? '?'}
                        </span>
                      </span>
                      {item.data.statut !== 'annulee' && (
                        <input
                          type="checkbox"
                          checked={item.data.statut === 'fait'}
                          onChange={(e) => toggleFait(item, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          title="Fait"
                        />
                      )}
                      {ressource && (
                        <a
                          href={ressource.url}
                          target="_blank"
                          rel="noreferrer"
                          title="Ouvrir la ressource"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="calendrier-wrapper">
            <div
              className="calendrier-grille"
              style={{
                gridTemplateRows: `${HAUTEUR_ENTETE}px repeat(${HEURES_GRILLE.length}, ${HAUTEUR_LIGNE}px)`,
              }}
            >
              <div className="cg-cell cg-entete" />
              {jours.map((jour, index) => (
                <div
                  className={`cg-cell cg-entete${jour === aujourdhui ? ' aujourdhui' : ''}`}
                  key={jour}
                >
                  {NOMS_JOURS[index].slice(0, 3)} <span className="semaine-jour-date">{formatJour(jour)}</span>
                </div>
              ))}

              {HEURES_GRILLE.map((heure) => (
                <Fragment key={heure}>
                  <div className="cg-cell cg-heure">
                    {heure}h
                  </div>
                  {jours.map((jour) => {
                    const items = (itemsParJour.get(jour) ?? []).filter(
                      (item) => Number(item.heure.slice(0, 2)) === heure,
                    )
                    const jourVide = itemsParJour.get(jour)?.length === 0
                    const passee = jour < aujourdhui
                    return (
                      <div className={`cg-cell${jourVide ? ' cg-cell-vide' : ''}`} key={`${jour}-${heure}`}>
                        {items.map((item) => {
                          const { classe, matiere, estEvaluation, titre, ressource } = detailsItem(item)
                          return (
                            <div
                              key={item.data.id}
                              className={`cg-evenement${estEvaluation ? ' semaine-item-evaluation' : ''}${passee ? ' semaine-item-passee' : ''}`}
                              style={!estEvaluation ? { borderLeftColor: matiere?.couleur ?? '#999' } : undefined}
                              onClick={() => setItemSelectionne(item)}
                            >
                              <span className="cg-evenement-titre">{titre}</span>
                              <span className="cg-evenement-classe">{classe?.nom ?? '?'}</span>
                              {item.data.statut !== 'annulee' && (
                                <input
                                  type="checkbox"
                                  checked={item.data.statut === 'fait'}
                                  onChange={(e) => toggleFait(item, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Fait"
                                />
                              )}
                              {ressource && (
                                <a
                                  href={ressource.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ouvrir la ressource"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  ↗
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
            {ligneActuelleVisible && (
              <div className="cg-ligne-actuelle" style={{ top: offsetLigneActuelle }} />
            )}
          </div>
        ))
      )}

      {itemSelectionne &&
        (() => {
          const { classe, matiere, estEvaluation, titre, ressource } = detailsItem(itemSelectionne)
          const seance = itemSelectionne.kind === 'seance' ? itemSelectionne.data : null
          return (
            <SeancePanel
              titre={titre}
              classeNom={classe?.nom ?? '?'}
              matiereNom={matiere?.nom ?? '?'}
              matiereCouleur={matiere?.couleur ?? '#999'}
              date={itemSelectionne.data.date}
              heureDebut={itemSelectionne.heure}
              fait={itemSelectionne.data.statut === 'fait'}
              estEvaluation={estEvaluation}
              estAnnulee={itemSelectionne.data.statut === 'annulee'}
              motifAnnulation={seance?.motif_annulation ?? null}
              notesSeance={seance?.notes_seance ?? null}
              ressourceUrl={ressource?.url}
              onToggleFait={(fait) => toggleFait(itemSelectionne, fait)}
              onEnregistrerNote={
                seance ? (notes) => handleEnregistrerNote(itemSelectionne, notes) : undefined
              }
              onDeplacer={
                seance ? (date, heure) => handleDeplacer(itemSelectionne, date, heure) : undefined
              }
              onAnnuler={(motif) => handleAnnuler(itemSelectionne, motif)}
              onClose={() => setItemSelectionne(null)}
            />
          )
        })()}

      {modalExceptionnelleOuvert && (
        <SeanceExceptionnelleModal
          options={optionsExceptionnelle}
          onEnregistrer={handleAjouterExceptionnelle}
          onClose={() => setModalExceptionnelleOuvert(false)}
        />
      )}
    </div>
  )
}

export default Semaine
