import type { SeanceAvecPlanning } from '../types/seance'
import type { Unite } from '../types/unite'
import { ajouterJours, parseISODate, toISODate } from './dates'

// Fenêtre de recherche au-delà du vendredi de la semaine affichée : une
// séance de la semaine suivante peut avoir une échéance de préparation
// (impression, instruction élèves) qui tombe cette semaine. Valeur généreuse
// et fixe plutôt que calculée dynamiquement à partir des délais existants —
// les délais de préparation sont par nature de l'ordre de quelques jours,
// pas de plusieurs semaines.
export const MARGE_ALERTES_JOURS = 21

export interface AlertePreparation {
  seance: SeanceAvecPlanning
  titre: string
  dateEcheance: string
}

function dateEcheance(date: string, delaiJours: number): string {
  return toISODate(ajouterJours(parseISODate(date), -delaiJours))
}

function seancesActives(seances: SeanceAvecPlanning[]): SeanceAvecPlanning[] {
  return seances.filter((s) => s.statut === 'a_venir' || s.statut === 'deplacee')
}

function titreSeance(seance: SeanceAvecPlanning, unite: Unite | undefined): string {
  return seance.override_titre ?? unite?.titre ?? '(unité supprimée)'
}

/**
 * Séances dont l'échéance d'impression (date du cours − délai d'impression
 * de l'unité, ou son override) tombe dans la semaine affichée — y compris
 * pour des séances qui ont lieu la semaine suivante.
 */
export function calculerAlertesImpression(
  seances: SeanceAvecPlanning[],
  unitesParId: Map<string, Unite>,
  lundi: string,
  vendredi: string,
): AlertePreparation[] {
  const resultat: AlertePreparation[] = []
  for (const s of seancesActives(seances)) {
    const unite = s.unite_id ? unitesParId.get(s.unite_id) : undefined
    const delai = s.override_delai_impression_jours ?? unite?.delai_impression_jours ?? null
    if (delai === null) continue
    const echeance = dateEcheance(s.date, delai)
    if (echeance < lundi || echeance > vendredi) continue
    resultat.push({ seance: s, titre: titreSeance(s, unite), dateEcheance: echeance })
  }
  return resultat.sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))
}

/**
 * Séances dont l'échéance de communication aux élèves (date du cours − délai
 * élèves de l'unité, ou son override) tombe dans la semaine affichée, et qui
 * portent effectivement une instruction à transmettre.
 */
export function calculerAlertesInstructionsEleves(
  seances: SeanceAvecPlanning[],
  unitesParId: Map<string, Unite>,
  lundi: string,
  vendredi: string,
): (AlertePreparation & { instruction: string })[] {
  const resultat: (AlertePreparation & { instruction: string })[] = []
  for (const s of seancesActives(seances)) {
    const unite = s.unite_id ? unitesParId.get(s.unite_id) : undefined
    const instruction = s.override_instruction_eleves ?? unite?.instruction_eleves ?? null
    if (!instruction) continue
    const delai = s.override_delai_eleves_jours ?? unite?.delai_eleves_jours ?? null
    if (delai === null) continue
    const echeance = dateEcheance(s.date, delai)
    if (echeance < lundi || echeance > vendredi) continue
    resultat.push({ seance: s, titre: titreSeance(s, unite), dateEcheance: echeance, instruction })
  }
  return resultat.sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))
}
