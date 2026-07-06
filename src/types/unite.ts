export interface Unite {
  id: string
  titre: string
  matiere_id: string
  chapitre_id: string | null
  ordre_interne_par_defaut: number | null
  delai_impression_jours: number | null
  delai_eleves_jours: number | null
  instruction_eleves: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
