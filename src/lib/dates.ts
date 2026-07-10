// Ne jamais utiliser Date.toISOString() pour formater une date locale : elle
// convertit en UTC et décale la date d'un jour dans les fuseaux en avance
// sur UTC (ex. Europe/Paris l'été). Toujours passer par les composants
// locaux (getFullYear/getMonth/getDate).
export function toISODate(date: Date): string {
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

export function parseISODate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

export function ajouterJours(date: Date, jours: number): Date {
  const copie = new Date(date)
  copie.setDate(copie.getDate() + jours)
  return copie
}

// Compare deux créneaux date+heure (chaînes ISO, comparables lexicalement).
export function estApres(
  a: { date: string; heure_debut: string },
  b: { date: string; heure_debut: string },
): boolean {
  return a.date > b.date || (a.date === b.date && a.heure_debut > b.heure_debut)
}
