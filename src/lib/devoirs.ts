import type { AnneeScolaire } from '../types/anneeScolaire'
import type { Creneau } from '../types/creneau'
import type { PeriodeCalendrier } from '../types/periodeCalendrier'
import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import { genererDatesCreneaux, cleCreneauDate, type CreneauDate } from './projectionEngine'

/**
 * Créneaux candidats pour reprogrammer un devoir depuis l'onglet Devoirs :
 * tout le pool de créneaux de la classe/matière sur l'année (vacances déjà
 * exclues par `genererDatesCreneaux`), moins ceux déjà pris par un autre
 * devoir du même planning ou par une séance déjà `fait`/`deplacee` — un
 * conflit avec l'un d'eux est bloquant (cf. `deplacerEvaluationAvecCascade`).
 * Un créneau occupé par une séance `a_venir` reste candidat : le choisir
 * déclenche la cascade qui la décale plutôt que de l'écraser.
 */
export function creneauxCandidatsDevoir(
  evaluationId: string,
  planningId: string,
  classeId: string,
  matiereId: string,
  anneeScolaire: AnneeScolaire,
  creneauxAnnee: Creneau[],
  periodes: PeriodeCalendrier[],
  seancesAnnee: SeanceAvecPlanning[],
  evaluationsAnnee: EvaluationAvecPlanning[],
): CreneauDate[] {
  const creneaux = creneauxAnnee.filter((c) => c.classe_id === classeId && c.matiere_id === matiereId)
  const pool = genererDatesCreneaux(creneaux, anneeScolaire, periodes)

  const conflitsDurs = new Set<string>()
  for (const e of evaluationsAnnee) {
    if (e.planning_id === planningId && e.id !== evaluationId) conflitsDurs.add(cleCreneauDate(e))
  }
  for (const s of seancesAnnee) {
    if (s.planning_id === planningId && s.statut !== 'a_venir') conflitsDurs.add(cleCreneauDate(s))
  }

  return pool.filter((d) => !conflitsDurs.has(cleCreneauDate(d)))
}
