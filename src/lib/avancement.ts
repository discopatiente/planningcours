import type { Seance } from '../types/seance'
import type { ProgressionUnite } from '../types/progressionUnite'
import { grouperParChapitre } from './chapitreGroupes'
import { lundiDeLaSemaine } from './semaineAB'

export type StatutBlocChapitre = 'termine' | 'en_cours' | 'a_venir'

export interface BlocChapitreAvancement {
  id: string
  nom: string
  nbUnites: number
  statut: StatutBlocChapitre
}

export interface AvancementPlanning {
  blocs: BlocChapitreAvancement[]
  pourcentage: number
  chapitreEnCoursNumero: number | null
  chapitreEnCoursNom: string | null
  statutTexte: string
  enRetard: boolean
  nbSeancesRetard: number
}

const AVANCEMENT_VIDE: AvancementPlanning = {
  blocs: [],
  pourcentage: 0,
  chapitreEnCoursNumero: null,
  chapitreEnCoursNom: null,
  statutTexte: 'Aucune progression assignée',
  enRetard: false,
  nbSeancesRetard: 0,
}

/**
 * Calcule l'état d'avancement d'un planning (classe + progression) pour le
 * tableau de bord « Où j'en suis » : découpage en blocs de chapitres avec
 * leur statut visuel, un pourcentage et le chapitre courant. La position
 * courante est la première unité de la progression pas encore `fait` — y
 * compris une unité jamais placée faute de créneau (débordement), traitée
 * comme « à venir ». Le retard se lit sur les séances déjà passées mais
 * toujours `a_venir` : l'enseignant n'a pas encore avancé jusque-là.
 */
export function calculerAvancement(
  progressionUnites: ProgressionUnite[],
  seancesPlanning: Pick<Seance, 'unite_id' | 'statut' | 'date'>[],
  aujourdhui: string,
): AvancementPlanning {
  if (progressionUnites.length === 0) return AVANCEMENT_VIDE

  const uniteFaite = new Set<string>()
  for (const s of seancesPlanning) {
    if (s.unite_id && s.statut === 'fait') uniteFaite.add(s.unite_id)
  }

  const indexUniteCourante = progressionUnites.findIndex((pu) => !uniteFaite.has(pu.unite_id))

  const groupes = grouperParChapitre(
    progressionUnites,
    (pu) => pu.unite.chapitre?.id ?? null,
    (pu) => pu.unite.chapitre?.nom ?? 'Sans chapitre',
  )

  let indexDebut = 0
  let chapitreEnCoursNumero: number | null = null
  let chapitreEnCoursNom: string | null = null
  const blocs: BlocChapitreAvancement[] = groupes.map((g, i) => {
    const indexFin = indexDebut + g.entrees.length - 1
    let statut: StatutBlocChapitre
    if (indexUniteCourante === -1 || indexFin < indexUniteCourante) statut = 'termine'
    else if (indexDebut <= indexUniteCourante) statut = 'en_cours'
    else statut = 'a_venir'
    if (statut === 'en_cours') {
      chapitreEnCoursNumero = i + 1
      chapitreEnCoursNom = g.chapitreNom
    }
    indexDebut = indexFin + 1
    return { id: g.cle, nom: g.chapitreNom, nbUnites: g.entrees.length, statut }
  })

  const pourcentage =
    indexUniteCourante === -1 ? 100 : Math.round((indexUniteCourante / progressionUnites.length) * 100)

  const nbSeancesRetard = seancesPlanning.filter((s) => s.statut === 'a_venir' && s.date < aujourdhui).length
  const enRetard = nbSeancesRetard > 0

  const statutTexte =
    indexUniteCourante === -1
      ? 'Progression terminée'
      : enRetard
        ? `En retard de ${nbSeancesRetard} séance${nbSeancesRetard > 1 ? 's' : ''}`
        : 'Dans les temps'

  return { blocs, pourcentage, chapitreEnCoursNumero, chapitreEnCoursNom, statutTexte, enRetard, nbSeancesRetard }
}

export interface SemaineAnnee {
  numero: number
  total: number
}

/** Indicateur temporel léger « semaine X sur Y », calé sur les lundis de l'année scolaire. */
export function semaineAnnee(dateDebut: string, dateFin: string, aujourdhui: string): SemaineAnnee {
  const lundiDebut = lundiDeLaSemaine(dateDebut)
  const lundiFin = lundiDeLaSemaine(dateFin)
  const lundiCourant = lundiDeLaSemaine(aujourdhui < dateDebut ? dateDebut : aujourdhui > dateFin ? dateFin : aujourdhui)

  const total = Math.round((lundiFin.getTime() - lundiDebut.getTime()) / 86_400_000 / 7) + 1
  const numero = Math.round((lundiCourant.getTime() - lundiDebut.getTime()) / 86_400_000 / 7) + 1

  return { numero: Math.min(Math.max(numero, 1), total), total }
}
