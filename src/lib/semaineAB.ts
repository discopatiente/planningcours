export type Semaine = 'A' | 'B'

function lundiDeLaSemaine(dateStr: string): Date {
  const date = new Date(`${dateStr}T00:00:00`)
  const jour = date.getDay()
  const decalage = jour === 0 ? -6 : 1 - jour
  date.setDate(date.getDate() + decalage)
  return date
}

/**
 * Détermine si `date` tombe dans une semaine A ou B, sachant que le lundi de
 * `referenceSemaineA` est explicitement une semaine A. Retourne null si aucune
 * référence n'est définie pour l'année scolaire.
 */
export function calculerSemaine(date: string, referenceSemaineA: string | null): Semaine | null {
  if (!referenceSemaineA) return null
  const lundiDate = lundiDeLaSemaine(date)
  const lundiRef = lundiDeLaSemaine(referenceSemaineA)
  const diffJours = (lundiDate.getTime() - lundiRef.getTime()) / (1000 * 60 * 60 * 24)
  const diffSemaines = Math.round(diffJours / 7)
  const parite = ((diffSemaines % 2) + 2) % 2
  return parite === 0 ? 'A' : 'B'
}
