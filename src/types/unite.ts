export interface Unite {
  id: string
  titre: string
  matiere_id: string
  lien_pdf: string | null
  delai_impression_jours: number | null
  delai_eleves_jours: number | null
  instruction_eleves: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
