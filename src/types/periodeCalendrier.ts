export type TypePeriode = 'vacances' | 'ferie'

export interface PeriodeCalendrier {
  id: string
  annee_scolaire_id: string
  nom: string
  date_debut: string
  date_fin: string
  type: TypePeriode
}
