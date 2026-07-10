import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import type { Unite } from '../types/unite'
import type { Matiere } from '../types/matiere'
import type { Classe } from '../types/classe'
import type { Progression } from '../types/progression'
import type { Ressource } from '../types/ressource'
import { libelleTrou, titreAvecDebordement } from './titresSeances'

export type ItemJour =
  | { kind: 'seance'; heure: string; data: SeanceAvecPlanning }
  | { kind: 'evaluation'; heure: string; data: EvaluationAvecPlanning }

export interface ContexteItemsJour {
  classesParId: Map<string, Classe>
  progressionsParId: Map<string, Progression>
  matieresParId: Map<string, Matiere>
  unitesParId: Map<string, Unite>
  ressourcePrincipaleParUnite: Map<string, Ressource>
}

export function formatHeure(heure: string): string {
  return heure.slice(0, 5)
}

// Une unité peut porter plusieurs ressources ; celle affichée en icône
// rapide dans les listes est la première de type `support`, ou à défaut la
// première ressource trouvée.
export function construireRessourcePrincipaleParUnite(ressources: Ressource[]): Map<string, Ressource> {
  const map = new Map<string, Ressource>()
  for (const r of ressources) {
    const existante = map.get(r.unite_id)
    if (!existante || (existante.type !== 'support' && r.type === 'support')) {
      map.set(r.unite_id, r)
    }
  }
  return map
}

export function matiereDeProgression(
  progressionId: string,
  ctx: Pick<ContexteItemsJour, 'progressionsParId' | 'matieresParId'>,
): Matiere | null {
  const progression = ctx.progressionsParId.get(progressionId)
  return progression ? ctx.matieresParId.get(progression.matiere_id) ?? null : null
}

// `seancesDuPlanning` : toutes les séances déjà chargées par la vue
// appelante (toutes classes confondues, `trouverSeancePrecedente` filtre par
// planning) — sert à retrouver la séance précédente pour le titre combiné en
// cas de débordement. Une vue à fenêtre étroite (ex. la vue du jour) peut ne
// pas contenir la précédente : le titre combiné n'apparaît alors pas, c'est
// une dégradation acceptée plutôt qu'une erreur.
export function detailsItem(item: ItemJour, ctx: ContexteItemsJour, seancesDuPlanning: SeanceAvecPlanning[] = []) {
  const classe = ctx.classesParId.get(item.data.planning.classe_id)
  const matiere = matiereDeProgression(item.data.planning.progression_id, ctx)
  const estEvaluation = item.kind === 'evaluation'
  const seance = estEvaluation ? null : (item.data as SeanceAvecPlanning)
  const estTrou = seance !== null && (seance.statut === 'annulee' || seance.statut === 'retard') && seance.unite_id === null
  const titre = estEvaluation
    ? (item.data as EvaluationAvecPlanning).titre ?? 'Évaluation'
    : estTrou
      ? libelleTrou(seance!.statut as 'annulee' | 'retard', seance!.motif_annulation)
      : titreAvecDebordement(seance!, ctx.unitesParId.get(seance!.unite_id ?? ''), seancesDuPlanning, ctx.unitesParId)
  const ressource = !estEvaluation ? ctx.ressourcePrincipaleParUnite.get(seance!.unite_id ?? '') : undefined
  return { classe, matiere, estEvaluation, titre, ressource }
}
