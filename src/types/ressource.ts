export type TypeRessource = 'support' | 'video' | 'exercice' | 'devoir_possible' | 'lien_utile'

export interface Ressource {
  id: string
  unite_id: string
  type: TypeRessource
  libelle: string | null
  url: string
  ordre: number
}
