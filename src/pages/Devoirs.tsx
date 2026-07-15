import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useEmploiDuTemps } from '../hooks/useEmploiDuTemps'
import { usePeriodesCalendrier } from '../hooks/usePeriodesCalendrier'
import { useParametres } from '../hooks/useParametres'
import { useSeancesEvaluationsAnnee } from '../hooks/useSeancesEvaluationsAnnee'
import { bornesTrimestres, cleCreneauDate, type CreneauDate } from '../lib/projectionEngine'
import { creneauxCandidatsDevoir } from '../lib/devoirs'
import { deplacerEvaluationAvecCascade } from '../lib/evaluationActions'
import { updateEvaluation } from '../lib/evaluations'
import { messageErreur } from '../lib/erreurs'
import { toISODate } from '../lib/dates'
import { lundiDeLaSemaine } from '../lib/semaineAB'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import type { Classe } from '../types/classe'
import type { Matiere } from '../types/matiere'

const TRIMESTRES: (1 | 2 | 3)[] = [1, 2, 3]

const LIBELLES_STATUT: Record<string, string> = {
  a_venir: 'À venir',
  fait: 'Fait',
  annulee: 'Annulée',
}

interface LigneDevoir {
  evaluation: EvaluationAvecPlanning
  classe: Classe
  matiere: Matiere | undefined
}

function formatCreneauLabel(d: CreneauDate) {
  const date = new Date(`${d.date}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return `${date} · ${d.heure_debut.slice(0, 5)}`
}

function Devoirs() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { creneaux } = useEmploiDuTemps(anneeActive?.id ?? null)
  const { periodes } = usePeriodesCalendrier(anneeActive?.id ?? null)
  const { parametres } = useParametres()
  const {
    seances,
    evaluations,
    loading,
    error: erreurChargement,
    reload,
  } = useSeancesEvaluationsAnnee(anneeActive?.id ?? null, anneeActive?.date_debut ?? '', anneeActive?.date_fin ?? '')

  const [trimestreChoisi, setTrimestreChoisi] = useState<1 | 2 | 3 | null>(null)
  const [enCours, setEnCours] = useState<Set<string>>(new Set())
  const [erreursLignes, setErreursLignes] = useState<Record<string, string | null>>({})
  const [ligneEnEdition, setLigneEnEdition] = useState<string | null>(null)

  const aujourdhui = toISODate(new Date())

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])

  function matiereDe(e: EvaluationAvecPlanning): Matiere | undefined {
    const progression = progressionsParId.get(e.planning.progression_id)
    return progression ? matieresParId.get(progression.matiere_id) : undefined
  }

  const bornes = useMemo(() => (anneeActive ? bornesTrimestres(anneeActive) : []), [anneeActive])
  const trimestreParDefaut = useMemo(() => {
    const b = bornes.find((borne) => aujourdhui < borne.fin) ?? bornes[bornes.length - 1]
    return b?.trimestre ?? 1
  }, [bornes, aujourdhui])
  const trimestre = trimestreChoisi ?? trimestreParDefaut

  const lignesTrimestre = useMemo(() => {
    const lignes: LigneDevoir[] = []
    for (const e of evaluations) {
      if (e.trimestre !== trimestre) continue
      const classe = classesParId.get(e.planning.classe_id)
      if (!classe) continue
      lignes.push({ evaluation: e, classe, matiere: matiereDe(e) })
    }
    return lignes.sort((a, b) =>
      a.evaluation.date === b.evaluation.date
        ? a.evaluation.heure_debut.localeCompare(b.evaluation.heure_debut)
        : a.evaluation.date.localeCompare(b.evaluation.date),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations, trimestre, classesParId, progressionsParId, matieresParId])

  // Nombre de devoirs déjà placés par semaine (toutes classes confondues, sur
  // toute l'année) — sert uniquement à l'avertissement non bloquant, cf.
  // règle max_evaluations_semaine (préférence, jamais bloquante ici).
  const comptageParSemaine = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of evaluations) {
      if (e.statut === 'annulee') continue
      if (matiereDe(e)?.max_evaluations_exclu) continue
      const semaine = toISODate(lundiDeLaSemaine(e.date))
      map.set(semaine, (map.get(semaine) ?? 0) + 1)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations, progressionsParId, matieresParId])

  const maxEvaluationsSemaine = parametres?.max_evaluations_semaine ?? Infinity

  async function handleChangerCreneau(evaluation: EvaluationAvecPlanning, classeId: string, matiereId: string, cle: string) {
    if (!anneeActive || cle === cleCreneauDate(evaluation)) return
    const [date, heure] = cle.split('|')
    setEnCours((prev) => new Set(prev).add(evaluation.id))
    setErreursLignes((prev) => ({ ...prev, [evaluation.id]: null }))
    try {
      await deplacerEvaluationAvecCascade(evaluation, date, heure, classeId, matiereId, anneeActive)
      await reload()
      setLigneEnEdition(null)
    } catch (err) {
      setErreursLignes((prev) => ({ ...prev, [evaluation.id]: messageErreur(err) }))
    } finally {
      setEnCours((prev) => {
        const next = new Set(prev)
        next.delete(evaluation.id)
        return next
      })
    }
  }

  async function handleChangerLien(evaluationId: string, champ: 'lien_sujet' | 'lien_corrige', valeur: string) {
    await updateEvaluation(evaluationId, { [champ]: valeur.trim() || null })
    await reload()
  }

  return (
    <div>
      <h2 className="section-title">Liste des devoirs</h2>
      <p className="section-desc">
        Dates des devoirs du trimestre sélectionné, toutes classes confondues. Les dates sont
        modifiables directement ici : le créneau libéré et le nouveau créneau occupé sont pris en
        compte pour que la progression de la classe reste continue, sans séance perdue.
      </p>

      {erreurChargement && <p className="error-text">{erreurChargement}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <>
            <div className="devoirs-trimestres">
              {TRIMESTRES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn-sm${trimestre === t ? ' btn-primary' : ''}`}
                  onClick={() => setTrimestreChoisi(t)}
                >
                  Trimestre {t}
                </button>
              ))}
            </div>

            {lignesTrimestre.length === 0 ? (
              <p className="section-desc">Aucun devoir ce trimestre.</p>
            ) : (
              <table className="devoirs-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Matière</th>
                    <th>Titre</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Sujet</th>
                    <th>Corrigé</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesTrimestre.map(({ evaluation, classe, matiere }) => {
                    const semaine = toISODate(lundiDeLaSemaine(evaluation.date))
                    const enDepassement = (comptageParSemaine.get(semaine) ?? 0) > maxEvaluationsSemaine
                    const cleActuelle = cleCreneauDate(evaluation)
                    const enEdition = ligneEnEdition === evaluation.id

                    return (
                      <tr key={evaluation.id}>
                        <td>{classe.nom}</td>
                        <td>{matiere?.nom ?? '?'}</td>
                        <td>{evaluation.titre ?? 'Évaluation'}</td>
                        <td>
                          {evaluation.statut === 'a_venir' && matiere ? (
                            enEdition ? (
                              <div className="devoirs-date-edition">
                                <select
                                  value={cleActuelle}
                                  autoFocus
                                  disabled={enCours.has(evaluation.id)}
                                  onChange={(e) =>
                                    handleChangerCreneau(evaluation, classe.id, matiere.id, e.target.value)
                                  }
                                >
                                  {(() => {
                                    const candidats = creneauxCandidatsDevoir(
                                      evaluation.id,
                                      evaluation.planning_id,
                                      classe.id,
                                      matiere.id,
                                      anneeActive,
                                      creneaux,
                                      periodes,
                                      seances,
                                      evaluations,
                                    )
                                    const options = candidats.some((d) => cleCreneauDate(d) === cleActuelle)
                                      ? candidats
                                      : [{ date: evaluation.date, heure_debut: evaluation.heure_debut }, ...candidats]
                                    return options
                                      .sort((a, b) => (cleCreneauDate(a) < cleCreneauDate(b) ? -1 : 1))
                                      .map((d) => (
                                        <option key={cleCreneauDate(d)} value={cleCreneauDate(d)}>
                                          {formatCreneauLabel(d)}
                                        </option>
                                      ))
                                  })()}
                                </select>
                                <button
                                  type="button"
                                  className="btn-sm"
                                  disabled={enCours.has(evaluation.id)}
                                  onClick={() => setLigneEnEdition(null)}
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <div className="devoirs-date-cell">
                                <span>{formatCreneauLabel(evaluation)}</span>
                                <button type="button" className="btn-sm" onClick={() => setLigneEnEdition(evaluation.id)}>
                                  Modifier
                                </button>
                              </div>
                            )
                          ) : (
                            formatCreneauLabel(evaluation)
                          )}
                          {enDepassement && (
                            <div className="devoirs-alerte-semaine">
                              ⚠ Semaine chargée (plus de {maxEvaluationsSemaine} devoir(s))
                            </div>
                          )}
                          {erreursLignes[evaluation.id] && (
                            <div className="error-text">{erreursLignes[evaluation.id]}</div>
                          )}
                        </td>
                        <td>{LIBELLES_STATUT[evaluation.statut] ?? evaluation.statut}</td>
                        <td>
                          <div className="devoirs-lien-cell">
                            <input
                              type="url"
                              className="input-sm"
                              placeholder="https://…"
                              defaultValue={evaluation.lien_sujet ?? ''}
                              onBlur={(e) => {
                                const valeur = e.target.value.trim()
                                if (valeur !== (evaluation.lien_sujet ?? '')) {
                                  handleChangerLien(evaluation.id, 'lien_sujet', valeur)
                                }
                              }}
                            />
                            {evaluation.lien_sujet && (
                              <a href={evaluation.lien_sujet} target="_blank" rel="noreferrer" title="Ouvrir le sujet">
                                ↗
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="devoirs-lien-cell">
                            <input
                              type="url"
                              className="input-sm"
                              placeholder="https://…"
                              defaultValue={evaluation.lien_corrige ?? ''}
                              onBlur={(e) => {
                                const valeur = e.target.value.trim()
                                if (valeur !== (evaluation.lien_corrige ?? '')) {
                                  handleChangerLien(evaluation.id, 'lien_corrige', valeur)
                                }
                              }}
                            />
                            {evaluation.lien_corrige && (
                              <a href={evaluation.lien_corrige} target="_blank" rel="noreferrer" title="Ouvrir le corrigé">
                                ↗
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )
      )}
    </div>
  )
}

export default Devoirs
