export interface Chapitre {
  id: string
  nom: string
  titre_court: string | null
  matiere_id: string
  archive: boolean
  created_at: string
  updated_at: string
}
