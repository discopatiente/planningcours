export type StatutSeance = 'a_venir' | 'fait' | 'annulee' | 'deplacee' | 'retard'

export interface Seance {
  id: string
  planning_id: string
  unite_id: string | null
  date: string
  heure_debut: string
  statut: StatutSeance
  motif_annulation: string | null
  notes_seance: string | null
  override_titre: string | null
  override_instruction_eleves: string | null
  override_delai_impression_jours: number | null
  override_delai_eleves_jours: number | null
  non_terminee: boolean
}

export interface SeanceAvecPlanning extends Seance {
  planning: { classe_id: string; progression_id: string }
}
