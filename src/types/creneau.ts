export type FrequenceCreneau = 'toutes_les_semaines' | 'semaine_a' | 'semaine_b'

export interface Creneau {
  id: string
  annee_scolaire_id: string
  jour_semaine: number
  heure_debut: string
  classe_id: string
  matiere_id: string
  frequence: FrequenceCreneau
}
