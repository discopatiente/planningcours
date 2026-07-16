export type StatutEvaluation = 'a_venir' | 'fait' | 'annulee'

export interface Evaluation {
  id: string
  planning_id: string
  date: string
  heure_debut: string
  trimestre: 1 | 2 | 3
  titre: string | null
  statut: StatutEvaluation
  lien_sujet: string | null
  lien_corrige: string | null
  banque_devoir_id: string | null
}

export interface EvaluationAvecPlanning extends Evaluation {
  planning: { classe_id: string; progression_id: string }
}
