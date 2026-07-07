export type StatutSeance = 'a_venir' | 'fait' | 'annulee' | 'deplacee'

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
}
