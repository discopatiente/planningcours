import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useUnites } from '../hooks/useUnites'
import { usePlannings } from '../hooks/usePlannings'
import { usePeriodesCalendrier } from '../hooks/usePeriodesCalendrier'
import { useGanttData } from '../hooks/useGanttData'
import { bornesTrimestres } from '../lib/projectionEngine'
import {
  diffJours,
  construireBlocsSeances,
  construirePointsEvaluations,
  construireChargeHebdomadaire,
  etiquettesMois,
  etiquettesSemaines,
  type BlocGantt,
  type PointEvaluation,
  type BlocCharge,
} from '../lib/gantt'
import { ajouterJours, parseISODate, toISODate } from '../lib/dates'
import { lundiDeLaSemaine } from '../lib/semaineAB'
import type { SeanceAvecPlanning } from '../types/seance'

type Mode = 'classe' | 'matiere' | 'charge'
type Zoom = 'annee' | 'trimestre' | 'mois'

const NIVEAUX_ZOOM: { valeur: Zoom; label: string }[] = [
  { valeur: 'annee', label: 'Année' },
  { valeur: 'trimestre', label: 'Trimestre' },
  { valeur: 'mois', label: 'Mois' },
]

const COULEUR_EVALUATION = '#D85A30'
const LARGEUR_LABEL = 180

interface Ligne {
  id: string
  label: string
  groupe?: string
  blocs: BlocGantt[]
  points: PointEvaluation[]
  charge: BlocCharge[]
}

function Gantt() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { plannings } = usePlannings(anneeActive?.id ?? null)
  const { periodes } = usePeriodesCalendrier(anneeActive?.id ?? null)

  const [mode, setMode] = useState<Mode>('classe')
  const [zoom, setZoom] = useState<Zoom>('annee')
  const [dateReference, setDateReference] = useState(() => toISODate(new Date()))

  const { seances, evaluations, loading, error } = useGanttData(
    anneeActive?.id ?? null,
    anneeActive?.date_debut ?? '',
    anneeActive?.date_fin ?? '',
  )

  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])
  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])

  const aujourdhui = toISODate(new Date())

  function matiereDeProgression(progressionId: string) {
    const progression = progressionsParId.get(progressionId)
    return progression ? matieresParId.get(progression.matiere_id) ?? null : null
  }

  const bornes = useMemo(() => (anneeActive ? bornesTrimestres(anneeActive) : []), [anneeActive])

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (!anneeActive) return { rangeStart: aujourdhui, rangeEnd: aujourdhui }
    if (zoom === 'annee') return { rangeStart: anneeActive.date_debut, rangeEnd: anneeActive.date_fin }
    if (zoom === 'trimestre') {
      const courant = bornes.find((b) => dateReference < b.fin) ?? bornes[bornes.length - 1] ?? {
        debut: anneeActive.date_debut,
        fin: anneeActive.date_fin,
      }
      return { rangeStart: courant.debut, rangeEnd: courant.fin }
    }
    const lundi = toISODate(lundiDeLaSemaine(dateReference))
    return { rangeStart: lundi, rangeEnd: toISODate(ajouterJours(parseISODate(lundi), 27)) }
  }, [zoom, dateReference, anneeActive, bornes, aujourdhui])

  const totalJours = diffJours(rangeStart, rangeEnd) + 1

  const indexTrimestreCourant = bornes.findIndex((b) => dateReference < b.fin)
  const indexZoom = NIVEAUX_ZOOM.findIndex((n) => n.valeur === zoom)

  function zoomerAvant() {
    const suivant = NIVEAUX_ZOOM[indexZoom + 1]
    if (suivant) setZoom(suivant.valeur)
  }

  function zoomerArriere() {
    const precedent = NIVEAUX_ZOOM[indexZoom - 1]
    if (precedent) setZoom(precedent.valeur)
  }

  function allerPrecedent() {
    if (zoom === 'trimestre') {
      const idx = Math.max(0, indexTrimestreCourant - 1)
      setDateReference(bornes[idx]?.debut ?? dateReference)
    } else if (zoom === 'mois') {
      setDateReference(toISODate(ajouterJours(parseISODate(rangeStart), -28)))
    }
  }

  function allerSuivant() {
    if (zoom === 'trimestre') {
      const idx = Math.min(bornes.length - 1, indexTrimestreCourant + 1)
      setDateReference(bornes[idx]?.debut ?? dateReference)
    } else if (zoom === 'mois') {
      setDateReference(toISODate(ajouterJours(parseISODate(rangeStart), 28)))
    }
  }

  const seancesVisibles = useMemo(
    () => seances.filter((s) => s.date >= rangeStart && s.date <= rangeEnd),
    [seances, rangeStart, rangeEnd],
  )
  const evaluationsVisibles = useMemo(
    () => evaluations.filter((e) => e.date >= rangeStart && e.date <= rangeEnd),
    [evaluations, rangeStart, rangeEnd],
  )

  const lignes: Ligne[] = useMemo(() => {
    if (!anneeActive) return []

    if (mode === 'charge') {
      const dates = [
        ...seancesVisibles.filter((s) => s.statut !== 'annulee' && s.statut !== 'retard').map((s) => s.date),
        ...evaluationsVisibles.filter((e) => e.statut !== 'annulee').map((e) => e.date),
      ]
      return [
        {
          id: 'charge',
          label: 'Toutes classes',
          blocs: [],
          points: [],
          charge: construireChargeHebdomadaire(dates, aujourdhui),
        },
      ]
    }

    if (mode === 'classe') {
      return classes
        .filter((c) => plannings.some((p) => p.classe_id === c.id))
        .map((classe) => {
          const seancesClasse = seancesVisibles.filter((s) => s.planning.classe_id === classe.id)
          const parMatiere = new Map<string, SeanceAvecPlanning[]>()
          for (const s of seancesClasse) {
            const matiere = matiereDeProgression(s.planning.progression_id)
            const cle = matiere?.id ?? '?'
            const liste = parMatiere.get(cle) ?? []
            liste.push(s)
            parMatiere.set(cle, liste)
          }
          const blocs = [...parMatiere.entries()].flatMap(([matiereId, liste]) =>
            construireBlocsSeances(liste, unitesParId, matieresParId.get(matiereId)?.couleur ?? '#999', aujourdhui),
          )
          const evaluationsClasse = evaluationsVisibles.filter((e) => e.planning.classe_id === classe.id)
          return {
            id: classe.id,
            label: classe.nom,
            blocs,
            points: construirePointsEvaluations(evaluationsClasse, aujourdhui),
            charge: [],
          }
        })
    }

    // mode === 'matiere' : une ligne par planning (classe + progression),
    // groupée par matière puis progression pour comparer les classes entre
    // elles au sein d'une même progression.
    return plannings
      .map((planning) => {
        const classe = classesParId.get(planning.classe_id)
        const progression = progressionsParId.get(planning.progression_id)
        const matiere = progression ? matieresParId.get(progression.matiere_id) : undefined
        if (!classe || !progression) return null
        const seancesPlanning = seancesVisibles.filter((s) => s.planning_id === planning.id)
        const evaluationsPlanning = evaluationsVisibles.filter((e) => e.planning_id === planning.id)
        return {
          id: planning.id,
          label: classe.nom,
          groupe: `${matiere?.nom ?? '?'} — ${progression.nom}`,
          tri: `${matiere?.nom ?? ''}|${progression.nom}|${classe.nom}`,
          blocs: construireBlocsSeances(seancesPlanning, unitesParId, matiere?.couleur ?? '#999', aujourdhui),
          points: construirePointsEvaluations(evaluationsPlanning, aujourdhui),
          charge: [],
        }
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.tri.localeCompare(b.tri))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    anneeActive,
    classes,
    plannings,
    seancesVisibles,
    evaluationsVisibles,
    unitesParId,
    matieresParId,
    classesParId,
    progressionsParId,
    aujourdhui,
  ])

  const etiquettesAxe = zoom === 'mois' ? etiquettesSemaines(rangeStart, rangeEnd) : etiquettesMois(rangeStart, rangeEnd)

  const vacances = useMemo(
    () =>
      periodes
        .filter((p) => p.type === 'vacances' && p.date_fin >= rangeStart && p.date_debut <= rangeEnd)
        .map((p) => {
          const debut = p.date_debut < rangeStart ? rangeStart : p.date_debut
          const fin = p.date_fin > rangeEnd ? rangeEnd : p.date_fin
          return {
            id: p.id,
            leftPct: (diffJours(rangeStart, debut) / totalJours) * 100,
            widthPct: ((diffJours(debut, fin) + 1) / totalJours) * 100,
          }
        }),
    [periodes, rangeStart, rangeEnd, totalJours],
  )

  const aujourdhuiVisible = aujourdhui >= rangeStart && aujourdhui <= rangeEnd
  const aujourdhuiPct = aujourdhuiVisible ? (diffJours(rangeStart, aujourdhui) / totalJours) * 100 : 0

  const planningsEnExces = plannings.filter((p) => p.nb_seances_en_exces > 0)

  let dernierGroupe: string | undefined

  return (
    <div>
      <h2 className="section-title">Gantt</h2>

      {planningsEnExces.length > 0 && (
        <div className="gantt-overflow-banner">
          ⚠ Débordement : {planningsEnExces.length} planning(s) ont plus d'unités que de créneaux disponibles.
          <ul>
            {planningsEnExces.map((p) => {
              const classe = classesParId.get(p.classe_id)
              const progression = progressionsParId.get(p.progression_id)
              return (
                <li key={p.id}>
                  {classe?.nom ?? '?'} — {progression?.nom ?? '?'} : {p.nb_seances_en_exces} séance(s) en excédent
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="gantt-toolbar">
        <div className="gantt-mode-toggle">
          <button type="button" className={`btn-sm${mode === 'classe' ? ' btn-primary' : ''}`} onClick={() => setMode('classe')}>
            Par classe
          </button>
          <button type="button" className={`btn-sm${mode === 'matiere' ? ' btn-primary' : ''}`} onClick={() => setMode('matiere')}>
            Par matière
          </button>
          <button type="button" className={`btn-sm${mode === 'charge' ? ' btn-primary' : ''}`} onClick={() => setMode('charge')}>
            Ma charge
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {zoom !== 'annee' && (
          <>
            <button type="button" className="btn-sm" onClick={allerPrecedent}>
              ◂
            </button>
            <span className="semaine-plage">
              {new Date(`${rangeStart}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(`${rangeEnd}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button type="button" className="btn-sm" onClick={allerSuivant}>
              ▸
            </button>
          </>
        )}

        <div className="gantt-zoom-toggle">
          <span className="gantt-zoom-label">Zoom</span>
          <button
            type="button"
            className="btn-sm"
            onClick={zoomerArriere}
            disabled={indexZoom === 0}
            title="Zoom arrière (vue plus large)"
            aria-label="Zoom arrière"
          >
            −
          </button>
          <span className="gantt-zoom-niveau">{NIVEAUX_ZOOM[indexZoom].label}</span>
          <button
            type="button"
            className="btn-sm"
            onClick={zoomerAvant}
            disabled={indexZoom === NIVEAUX_ZOOM.length - 1}
            title="Zoom avant (vue plus détaillée)"
            aria-label="Zoom avant"
          >
            +
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <div className="gantt-wrapper">
            <div
              className="gantt-header"
              style={{ gridTemplateColumns: `${LARGEUR_LABEL}px repeat(${totalJours}, minmax(0, 1fr))` }}
            >
              <div className="gantt-corner" />
              {etiquettesAxe.map((e) => (
                <div key={e.id} className="gantt-axis-label" style={{ gridColumn: `${e.colDebut + 2} / span ${e.colSpan}` }}>
                  {e.label}
                </div>
              ))}
            </div>

            <div className="gantt-body">
              {vacances.map((v) => (
                <div
                  key={v.id}
                  className="gantt-vacances"
                  style={{ left: `calc(${LARGEUR_LABEL}px + ${v.leftPct}%)`, width: `${v.widthPct}%` }}
                />
              ))}
              {aujourdhuiVisible && (
                <div className="gantt-aujourdhui-ligne" style={{ left: `calc(${LARGEUR_LABEL}px + ${aujourdhuiPct}%)` }} />
              )}

              {lignes.map((ligne) => {
                const groupeChange = mode === 'matiere' && ligne.groupe !== dernierGroupe
                if (groupeChange) dernierGroupe = ligne.groupe
                return (
                  <div key={ligne.id}>
                    {groupeChange && <div className="gantt-groupe-header">{ligne.groupe}</div>}
                    <div
                      className="gantt-row"
                      style={{ gridTemplateColumns: `${LARGEUR_LABEL}px repeat(${totalJours}, minmax(0, 1fr))` }}
                    >
                      <div className="gantt-row-label">{ligne.label}</div>
                      <div
                        className="gantt-row-timeline"
                        style={{ gridColumn: `2 / span ${totalJours}`, gridTemplateColumns: `repeat(${totalJours}, minmax(0, 1fr))` }}
                      >
                        {ligne.blocs.map((b) => (
                          <div
                            key={b.id}
                            className={`gantt-bloc${b.passee ? ' gantt-bloc-passee' : ''}`}
                            style={{
                              gridColumn: `${diffJours(rangeStart, b.date) + 1} / span 1`,
                              background: b.couleur,
                            }}
                            title={b.titre}
                          >
                            {b.titre}
                          </div>
                        ))}
                        {ligne.points.map((p) => (
                          <div
                            key={p.id}
                            className={`gantt-point${p.passee ? ' gantt-bloc-passee' : ''}`}
                            style={{ gridColumn: `${diffJours(rangeStart, p.date) + 1} / span 1`, background: COULEUR_EVALUATION }}
                            title="Évaluation"
                          />
                        ))}
                        {ligne.charge.map((c) => (
                          <div
                            key={c.id}
                            className={`gantt-charge-bar${c.passee ? ' gantt-bloc-passee' : ''}`}
                            style={{
                              gridColumn: `${diffJours(rangeStart, c.semaineDebut) + 1} / span 7`,
                              opacity: Math.min(1, 0.25 + c.count * 0.12),
                            }}
                            title={`${c.count} séance(s)`}
                          >
                            {c.count}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}

              {lignes.length === 0 && <p className="section-desc">Aucun planning généré pour cette année.</p>}
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default Gantt
