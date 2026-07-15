export type NiveauBanqueDevoir = 'seconde' | 'premiere' | 'terminale'

export interface BanqueDevoir {
  id: string
  titre: string
  matiere_id: string
  niveau: NiveauBanqueDevoir
  notion: string | null
  lien_sujet: string | null
  lien_corrige: string | null
  created_at: string
  updated_at: string
}
