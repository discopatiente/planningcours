import type { AnneeScolaire } from '../types/anneeScolaire'
import type { Evaluation } from '../types/evaluation'
import { fetchCreneaux } from './emploiDuTemps'
import { fetchPeriodesCalendrier } from './periodesCalendrier'
import { fetchProgressionUnites } from './progressionUnites'
import { fetchProgressions } from './progressions'
import { fetchMatieres } from './matieres'
import { fetchEvaluationsPlanning, fetchEvaluationsAnnee, updateEvaluation } from './evaluations'
import { fetchPlanningById, updateNbSeancesEnExces } from './plannings'
import { fetchSeancesPlanning, insertSeanceExceptionnelle, updateSeance } from './seances'
import {
  genererDatesCreneaux,
  cleCreneauDate,
  trouverCreneauEvaluation,
  bornesTrimestres,
  type CreneauDate,
} from './projectionEngine'
import { estApres, toISODate } from './dates'
import { lundiDeLaSemaine } from './semaineAB'

/**
 * Reporte un devoir empêché par un imprévu : le créneau qu'il occupait
 * devient une séance de cours normale (la progression de la classe
 * avance), chaque séance à venir qui suivait remonte d'un cran (cascade
 * arrière, symétrique de `annulerSeance`), et le devoir se replace
 * lui-même sur le prochain créneau valide — jamais un jour de vacances
 * (garanti par construction via `genererDatesCreneaux`), en respectant le
 * plafond max_evaluations_semaine si possible mais sans jamais bloquer
 * (cf. `trouverCreneauEvaluation`).
 */
export async function reporterEvaluation(
  evaluation: Evaluation,
  classeId: string,
  matiereId: string,
  matiereExclueDuPlafond: boolean,
  anneeScolaire: AnneeScolaire,
  maxEvaluationsSemaine: number,
): Promise<void> {
  const [creneauxAnnee, periodes, seancesPlanning, evaluationsPlanning, evaluationsAnnee, progressions, matieres, planning] =
    await Promise.all([
      fetchCreneaux(anneeScolaire.id),
      fetchPeriodesCalendrier(anneeScolaire.id),
      fetchSeancesPlanning(evaluation.planning_id),
      fetchEvaluationsPlanning(evaluation.planning_id),
      fetchEvaluationsAnnee(anneeScolaire.id),
      fetchProgressions(),
      fetchMatieres(),
      fetchPlanningById(evaluation.planning_id),
    ])

  const creneaux = creneauxAnnee.filter((c) => c.classe_id === classeId && c.matiere_id === matiereId)
  const pool = genererDatesCreneaux(creneaux, anneeScolaire, periodes)

  const occupees = new Set<string>()
  for (const s of seancesPlanning) occupees.add(cleCreneauDate(s))
  for (const e of evaluationsPlanning) if (e.id !== evaluation.id) occupees.add(cleCreneauDate(e))

  const matiereIdParProgression = new Map(progressions.map((p) => [p.id, p.matiere_id]))
  const exclusionParMatiere = new Map(matieres.map((m) => [m.id, m.max_evaluations_exclu]))
  const comptageParSemaine = new Map<string, number>()
  for (const ev of evaluationsAnnee) {
    const exclue = exclusionParMatiere.get(matiereIdParProgression.get(ev.progression_id) ?? '') ?? false
    if (exclue) continue
    const semaine = toISODate(lundiDeLaSemaine(ev.date))
    comptageParSemaine.set(semaine, (comptageParSemaine.get(semaine) ?? 0) + 1)
  }

  const indexDepart = pool.findIndex((d) => estApres(d, evaluation))
  const nouveauCreneau = trouverCreneauEvaluation(
    pool,
    indexDepart === -1 ? pool.length : indexDepart,
    occupees,
    comptageParSemaine,
    maxEvaluationsSemaine,
    matiereExclueDuPlafond,
  )
  if (!nouveauCreneau) {
    throw new Error('Aucun créneau disponible cette année pour reporter ce devoir.')
  }

  const suivantes = seancesPlanning
    .filter((s) => s.statut === 'a_venir')
    .filter((s) => estApres(s, evaluation))
    .sort((a, b) => (a.date === b.date ? a.heure_debut.localeCompare(b.heure_debut) : a.date.localeCompare(b.date)))

  const cibles: CreneauDate[] = [
    { date: evaluation.date, heure_debut: evaluation.heure_debut },
    ...suivantes.slice(0, -1).map((s) => ({ date: s.date, heure_debut: s.heure_debut })),
  ]

  for (let i = 0; i < suivantes.length; i++) {
    await updateSeance(suivantes[i].id, { date: cibles[i].date, heure_debut: cibles[i].heure_debut })
  }

  const creneauLibere: CreneauDate =
    suivantes.length > 0
      ? { date: suivantes[suivantes.length - 1].date, heure_debut: suivantes[suivantes.length - 1].heure_debut }
      : { date: evaluation.date, heure_debut: evaluation.heure_debut }

  if (planning.nb_seances_en_exces > 0) {
    const progressionUnites = await fetchProgressionUnites(planning.progression_id)
    const uniteIdsPlacees = new Set(seancesPlanning.filter((s) => s.unite_id).map((s) => s.unite_id))
    const prochaineUnite = progressionUnites.find((pu) => !uniteIdsPlacees.has(pu.unite_id))
    if (prochaineUnite) {
      await insertSeanceExceptionnelle(planning.id, prochaineUnite.unite_id, creneauLibere.date, creneauLibere.heure_debut)
      await updateNbSeancesEnExces(planning.id, planning.nb_seances_en_exces - 1)
    }
  }

  await updateEvaluation(evaluation.id, { date: nouveauCreneau.date, heure_debut: nouveauCreneau.heure_debut })
}

/**
 * Déplace un devoir vers une nouvelle date/heure choisie manuellement
 * (onglet Devoirs), en réappliquant la progression pour ne jamais laisser de
 * trou : l'ancien créneau du devoir se libère, le nouveau devient
 * indisponible, et les séances `a_venir` de la classe strictement comprises
 * entre les deux tournent d'un cran pour absorber ce décalage — jamais les
 * séances déjà `fait`/`deplacee`, ni les autres devoirs, qui ne bougent
 * jamais ici (un conflit avec l'un d'eux est bloquant, contrairement au
 * débordement de progression qui ne bloque jamais). `nouvelleDate`/
 * `nouvelleHeure` doivent correspondre à un créneau réel de l'emploi du
 * temps de la classe/matière — ce que garantit l'appelant en ne proposant
 * que des créneaux du pool `genererDatesCreneaux`.
 */
export async function deplacerEvaluationAvecCascade(
  evaluation: Evaluation,
  nouvelleDate: string,
  nouvelleHeure: string,
  classeId: string,
  matiereId: string,
  anneeScolaire: AnneeScolaire,
): Promise<void> {
  const [creneauxAnnee, periodes, seancesPlanning, evaluationsPlanning] = await Promise.all([
    fetchCreneaux(anneeScolaire.id),
    fetchPeriodesCalendrier(anneeScolaire.id),
    fetchSeancesPlanning(evaluation.planning_id),
    fetchEvaluationsPlanning(evaluation.planning_id),
  ])

  const creneaux = creneauxAnnee.filter((c) => c.classe_id === classeId && c.matiere_id === matiereId)
  const pool = genererDatesCreneaux(creneaux, anneeScolaire, periodes)

  const ancienneCle = cleCreneauDate(evaluation)
  const nouvelleCible: CreneauDate = { date: nouvelleDate, heure_debut: nouvelleHeure }
  const nouvelleCle = cleCreneauDate(nouvelleCible)

  if (nouvelleCle === ancienneCle) return
  if (!pool.some((d) => cleCreneauDate(d) === nouvelleCle)) {
    throw new Error("Ce créneau ne correspond pas à l'emploi du temps de cette classe pour cette matière.")
  }

  const conflitAutreDevoir = evaluationsPlanning.some((e) => e.id !== evaluation.id && cleCreneauDate(e) === nouvelleCle)
  const seanceCible = seancesPlanning.find((s) => cleCreneauDate(s) === nouvelleCle)
  if (conflitAutreDevoir || (seanceCible && seanceCible.statut !== 'a_venir')) {
    throw new Error('Ce créneau est déjà occupé.')
  }

  const versLeFutur = nouvelleCle > ancienneCle
  const ancienneCible: CreneauDate = { date: evaluation.date, heure_debut: evaluation.heure_debut }

  const affectees = seancesPlanning
    .filter((s) => s.statut === 'a_venir')
    .filter((s) => {
      const cle = cleCreneauDate(s)
      return versLeFutur ? cle > ancienneCle && cle <= nouvelleCle : cle >= nouvelleCle && cle < ancienneCle
    })
    .sort((a, b) => (cleCreneauDate(a) < cleCreneauDate(b) ? -1 : 1))

  const cibles: CreneauDate[] = versLeFutur
    ? [ancienneCible, ...affectees.slice(0, -1).map((s) => ({ date: s.date, heure_debut: s.heure_debut }))]
    : [...affectees.slice(1).map((s) => ({ date: s.date, heure_debut: s.heure_debut })), ancienneCible]

  for (let i = 0; i < affectees.length; i++) {
    await updateSeance(affectees[i].id, { date: cibles[i].date, heure_debut: cibles[i].heure_debut })
  }

  const bornes = bornesTrimestres(anneeScolaire)
  const nouveauTrimestre = (bornes.find((b) => nouvelleDate < b.fin) ?? bornes[bornes.length - 1]).trimestre

  await updateEvaluation(evaluation.id, { date: nouvelleDate, heure_debut: nouvelleHeure, trimestre: nouveauTrimestre })
}
