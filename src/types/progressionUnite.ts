import type { Unite } from './unite'

export interface ProgressionUniteChapitre {
  id: string
  nom: string
}

export interface ProgressionUnite {
  id: string
  progression_id: string
  unite_id: string
  position: number
  unite: Unite & { chapitre: ProgressionUniteChapitre | null }
}
