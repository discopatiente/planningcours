import { ajouterJours, parseISODate, toISODate } from './dates'

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

// Ne jamais utiliser toISOString() ici : elle convertit en UTC et décale la
// date d'un jour dans les fuseaux en avance sur UTC (Europe/Paris l'été) —
// cf. le même piège déjà rencontré dans le moteur de projection.
function veille(dateStr: string): string {
  return toISODate(ajouterJours(parseISODate(dateStr), -1))
}

// L'API renvoie des dates bornes exclusives à minuit (heure de Paris) : le
// retour en classe a lieu le jour de `end_date`, pas la veille. Certaines
// périodes d'un seul jour (ponts) ont `start_date` et `end_date` identiques
// plutôt qu'un lendemain exclusif — dans ce cas `veille()` produirait une
// date de fin antérieure à la date de début.
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
    const dateDebut = datePariesienne(enr.start_date)
    const finExclusive = datePariesienne(enr.end_date)
    return {
      nom: enr.description,
      date_debut: dateDebut,
      date_fin: finExclusive === dateDebut ? dateDebut : veille(finExclusive),
      type: 'vacances' as const,
    }
  })
}
