import type { Unite } from '../types/unite'
import type { StatutSeance } from '../types/seance'
import { estApres } from './dates'

// Forme minimale nécessaire pour calculer un titre — satisfaite par
// `SeanceAvecPlanning` mais aussi par les vues plus étroites utilisées dans
// le Gantt, pour éviter de dépendre du type complet partout.
export interface SeanceTitrable {
  id: string
  planning_id: string
  date: string
  heure_debut: string
  unite_id: string | null
  override_titre: string | null
  statut: StatutSeance
  non_terminee: boolean
  motif_annulation: string | null
}

// Titre de base d'une séance : override explicite, sinon celui de l'unité,
// sinon un repli si l'unité a été supprimée du référentiel.
export function titreUnite(
  seance: Pick<SeanceTitrable, 'override_titre' | 'unite_id'>,
  unite: Unite | undefined,
): string {
  return seance.override_titre ?? unite?.titre ?? '(unité supprimée)'
}

// Libellé d'un créneau vide (trou d'annulation).
export function libelleTrou(motif: string | null): string {
  return motif ? `Séance annulée — ${motif}` : 'Séance annulée'
}

// Séance immédiatement avant `seance` dans le même planning, parmi celles
// fournies — retrouvée dynamiquement par ordre chronologique plutôt que par
// un pointeur stocké, donc toujours correcte même après un décalage
// ultérieur (annulation, déplacement...).
export function trouverSeancePrecedente<T extends SeanceTitrable>(seance: T, seancesDuPlanning: T[]): T | null {
  let precedente: T | null = null
  for (const s of seancesDuPlanning) {
    if (s.id === seance.id || s.planning_id !== seance.planning_id) continue
    if (!estApres(seance, s)) continue
    if (!precedente || estApres(s, precedente)) precedente = s
  }
  return precedente
}

// Séance `a_venir` immédiatement après `seance` dans le même planning, parmi
// celles fournies — sert à savoir si l'action « j'ai de l'avance » a bien
// quelque chose à absorber.
export function trouverSeanceSuivante<T extends SeanceTitrable>(seance: T, seancesDuPlanning: T[]): T | null {
  let suivante: T | null = null
  for (const s of seancesDuPlanning) {
    if (s.id === seance.id || s.planning_id !== seance.planning_id || s.statut !== 'a_venir') continue
    if (!estApres(s, seance)) continue
    if (!suivante || estApres(suivante, s)) suivante = s
  }
  return suivante
}

// Titre affiché pour une séance normale (pas un trou) : combine avec la
// précédente si celle-ci a été marquée non terminée (déborde sur cette
// séance-ci). Recherche limitée à la séance immédiatement précédente — pas
// de gestion de chaîne sur plusieurs séances consécutives.
export function titreAvecDebordement<T extends SeanceTitrable>(
  seance: T,
  unite: Unite | undefined,
  seancesDuPlanning: T[],
  unitesParId: Map<string, Unite>,
): string {
  const titreNormal = titreUnite(seance, unite)
  const precedente = trouverSeancePrecedente(seance, seancesDuPlanning)
  if (!precedente?.non_terminee) return titreNormal
  const unitePrecedente = precedente.unite_id ? unitesParId.get(precedente.unite_id) : undefined
  const titrePrecedent = titreUnite(precedente, unitePrecedente)
  return `Fin de ${titrePrecedent} + ${titreNormal}`
}
