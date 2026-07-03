export interface AnneeScolaire {
  id: string
  libelle: string
  date_debut: string
  date_fin: string
  active: boolean
  reference_semaine_a_date: string | null
}
