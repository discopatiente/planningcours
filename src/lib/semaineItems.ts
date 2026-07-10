import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import type { Unite } from '../types/unite'
import type { Matiere } from '../types/matiere'
import type { Classe } from '../types/classe'
import type { Progression } from '../types/progression'
import type { Ressource } from '../types/ressource'

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

export function detailsItem(item: ItemJour, ctx: ContexteItemsJour) {
  const classe = ctx.classesParId.get(item.data.planning.classe_id)
  const matiere = matiereDeProgression(item.data.planning.progression_id, ctx)
  const estEvaluation = item.kind === 'evaluation'
  const seanceAnnuleeSansUnite =
    !estEvaluation && item.data.statut === 'annulee' && (item.data as SeanceAvecPlanning).unite_id === null
  const titre = estEvaluation
    ? (item.data as EvaluationAvecPlanning).titre ?? 'Évaluation'
    : seanceAnnuleeSansUnite
      ? 'Séance annulée'
      : (item.data as SeanceAvecPlanning).override_titre ??
        ctx.unitesParId.get((item.data as SeanceAvecPlanning).unite_id ?? '')?.titre ??
        '(unité supprimée)'
  const ressource = !estEvaluation
    ? ctx.ressourcePrincipaleParUnite.get((item.data as SeanceAvecPlanning).unite_id ?? '')
    : undefined
  return { classe, matiere, estEvaluation, titre, ressource }
}
