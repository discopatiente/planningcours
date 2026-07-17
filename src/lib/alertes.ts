import type { SeanceAvecPlanning } from '../types/seance'
import type { Unite } from '../types/unite'
import type { Ressource } from '../types/ressource'
import type { EtatRessourceSeance } from '../types/impression'
import { ajouterJours, parseISODate, toISODate } from './dates'
import { cleEtatRessourceSeance } from './impressions'
import { titreUnite } from './titresSeances'

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

// Ressources physiquement imprimées/distribuées de la séance (celles dont
// `necessite_impression` est vrai). Une unité sans aucune ressource de ce
// type n'a rien à cocher : on ne peut pas considérer l'impression « faite »,
// donc l'alerte reste pilotée par le délai seul dans ce cas.
function ressourcesImprimablesSeance(
  seance: SeanceAvecPlanning,
  ressourcesParUnite: Map<string, Ressource[]>,
): Ressource[] {
  return seance.unite_id ? ressourcesParUnite.get(seance.unite_id) ?? [] : []
}

function toutesRessourcesImprimees(
  seance: SeanceAvecPlanning,
  ressourcesParUnite: Map<string, Ressource[]>,
  etats: Map<string, EtatRessourceSeance>,
): boolean {
  const ressources = ressourcesImprimablesSeance(seance, ressourcesParUnite)
  if (ressources.length === 0) return false
  return ressources.every((r) => etats.get(cleEtatRessourceSeance(seance.id, r.id))?.imprime ?? false)
}

function toutesRessourcesDistribuees(
  seance: SeanceAvecPlanning,
  ressourcesParUnite: Map<string, Ressource[]>,
  etats: Map<string, EtatRessourceSeance>,
): boolean {
  const ressources = ressourcesImprimablesSeance(seance, ressourcesParUnite)
  if (ressources.length === 0) return false
  return ressources.every((r) => etats.get(cleEtatRessourceSeance(seance.id, r.id))?.distribue ?? false)
}

/**
 * Séances dont l'échéance d'impression (date du cours − délai d'impression
 * de l'unité, ou son override) tombe dans la semaine affichée — y compris
 * pour des séances qui ont lieu la semaine suivante. Une séance dont toutes
 * les ressources imprimables sont déjà cochées « imprimé » (onglet
 * Impressions) sort de la liste : il n'y a plus rien à rappeler.
 */
export function calculerAlertesImpression(
  seances: SeanceAvecPlanning[],
  unitesParId: Map<string, Unite>,
  lundi: string,
  vendredi: string,
  ressourcesParUnite: Map<string, Ressource[]>,
  etats: Map<string, EtatRessourceSeance>,
  delaiParDefaut: number | null,
): AlertePreparation[] {
  const resultat: AlertePreparation[] = []
  for (const s of seancesActives(seances)) {
    if (toutesRessourcesImprimees(s, ressourcesParUnite, etats)) continue
    const unite = s.unite_id ? unitesParId.get(s.unite_id) : undefined
    // Secours : sans delai_impression_jours propre à l'unité ni override, on
    // retombe sur le délai par défaut des Paramètres plutôt que de ne
    // générer aucune alerte — avant ce secours, une unité jamais configurée
    // n'émettait jamais d'alerte, silencieusement.
    const delai = s.override_delai_impression_jours ?? unite?.delai_impression_jours ?? delaiParDefaut ?? null
    if (delai === null) continue
    const echeance = dateEcheance(s.date, delai)
    if (echeance < lundi || echeance > vendredi) continue
    resultat.push({ seance: s, titre: titreUnite(s, unite), dateEcheance: echeance })
  }
  return resultat.sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))
}

/**
 * Séances de la semaine affichée dont les ressources imprimables sont
 * toutes imprimées mais pas encore toutes distribuées — prend le relais du
 * rappel d'impression une fois celui-ci coché dans l'onglet Impressions.
 */
export function calculerAlertesDistribution(
  seances: SeanceAvecPlanning[],
  unitesParId: Map<string, Unite>,
  ressourcesParUnite: Map<string, Ressource[]>,
  etats: Map<string, EtatRessourceSeance>,
  lundi: string,
  vendredi: string,
): AlertePreparation[] {
  const resultat: AlertePreparation[] = []
  for (const s of seancesActives(seances)) {
    if (s.date < lundi || s.date > vendredi) continue
    if (!toutesRessourcesImprimees(s, ressourcesParUnite, etats)) continue
    if (toutesRessourcesDistribuees(s, ressourcesParUnite, etats)) continue
    const unite = s.unite_id ? unitesParId.get(s.unite_id) : undefined
    resultat.push({ seance: s, titre: titreUnite(s, unite), dateEcheance: s.date })
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
    resultat.push({ seance: s, titre: titreUnite(s, unite), dateEcheance: echeance, instruction })
  }
  return resultat.sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))
}
