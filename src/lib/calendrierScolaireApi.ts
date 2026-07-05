const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records'

// Académies telles que nommées dans le jeu de données "location" de l'API.
export const ACADEMIES = [
  'Aix-Marseille',
  'Amiens',
  'Besançon',
  'Bordeaux',
  'Caen',
  'Clermont-Ferrand',
  'Corse',
  'Créteil',
  'Dijon',
  'Grenoble',
  'Guadeloupe',
  'Guyane',
  'Lille',
  'Limoges',
  'Lyon',
  'Martinique',
  'Mayotte',
  'Montpellier',
  'Nancy-Metz',
  'Nantes',
  'Nice',
  'Normandie',
  'Nouvelle-Calédonie',
  'Orléans-Tours',
  'Paris',
  'Poitiers',
  'Polynésie française',
  'Reims',
  'Rennes',
  'La Réunion',
  'Rouen',
  'Saint Pierre et Miquelon',
  'Strasbourg',
  'Toulouse',
  'Versailles',
  'Wallis et Futuna',
]

interface EnregistrementApi {
  description: string
  population: string
  start_date: string
  end_date: string
}

export interface PeriodeImportee {
  nom: string
  date_debut: string
  date_fin: string
  type: 'vacances'
}

function datePariesienne(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso))
}

function veille(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// L'API renvoie des dates bornes exclusives à minuit (heure de Paris) : le
// retour en classe a lieu le jour de `end_date`, pas la veille.
export async function importerPeriodesAcademie(
  academie: string,
  anneeScolaire: string,
): Promise<PeriodeImportee[]> {
  const params = new URLSearchParams({
    where: `location="${academie}" AND annee_scolaire="${anneeScolaire}"`,
    limit: '100',
  })

  let response: Response
  try {
    response = await fetch(`${API_URL}?${params}`)
  } catch {
    throw new Error("Impossible de joindre l'API du calendrier scolaire. Réessaie plus tard ou saisis les périodes manuellement.")
  }
  if (!response.ok) {
    throw new Error("L'API du calendrier scolaire a répondu avec une erreur. Réessaie plus tard ou saisis les périodes manuellement.")
  }

  const body = await response.json()
  const enregistrements: EnregistrementApi[] = body.results ?? []

  // Une même période peut apparaître deux fois (population "Élèves" vs
  // "Enseignants", ex. vacances d'été) : on ignore la version enseignants.
  const parPeriode = new Map<string, EnregistrementApi>()
  for (const enr of enregistrements) {
    if (enr.population === 'Enseignants') continue
    const cle = `${enr.description}|${enr.start_date}`
    if (!parPeriode.has(cle)) parPeriode.set(cle, enr)
  }

  return [...parPeriode.values()].map((enr) => {
    const finExclusive = datePariesienne(enr.end_date)
    return {
      nom: enr.description,
      date_debut: datePariesienne(enr.start_date),
      date_fin: veille(finExclusive),
      type: 'vacances' as const,
    }
  })
}
