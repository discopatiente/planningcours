import { ajouterJours, parseISODate, toISODate } from './dates'
import { lundiDeLaSemaine } from './semaineAB'
import { titreAvecDebordement } from './titresSeances'
import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import type { Unite } from '../types/unite'

export function diffJours(dateA: string, dateB: string): number {
  return Math.round((parseISODate(dateB).getTime() - parseISODate(dateA).getTime()) / 86_400_000)
}

function estPassee(date: string, aujourdhui: string): boolean {
  return date < aujourdhui
}

export interface BlocGantt {
  id: string
  date: string
  titre: string
  couleur: string
  passee: boolean
}

export interface PointEvaluation {
  id: string
  date: string
  passee: boolean
}

type SeanceGantt = Pick<
  SeanceAvecPlanning,
  'id' | 'planning_id' | 'date' | 'heure_debut' | 'unite_id' | 'override_titre' | 'statut' | 'non_terminee' | 'motif_annulation'
>

/**
 * Regroupe les séances d'une ligne par jour : un jour avec plusieurs séances
 * affiche un compteur plutôt que d'empiler des titres illisibles. Les
 * séances annulées (trous sans unité) ne comptent pas comme de la charge de
 * travail à afficher.
 */
export function construireBlocsSeances(
  seances: SeanceGantt[],
  unitesParId: Map<string, Unite>,
  couleur: string,
  aujourdhui: string,
): BlocGantt[] {
  const parDate = new Map<string, typeof seances>()
  for (const s of seances) {
    if (s.statut === 'annulee' && s.unite_id === null) continue
    const liste = parDate.get(s.date) ?? []
    liste.push(s)
    parDate.set(s.date, liste)
  }

  const blocs: BlocGantt[] = []
  for (const [date, liste] of parDate) {
    const titre =
      liste.length === 1
        ? titreAvecDebordement(liste[0], unitesParId.get(liste[0].unite_id ?? ''), seances, unitesParId)
        : `${liste.length} séances`
    blocs.push({
      id: `${date}-${liste.map((s) => s.id).join('-')}`,
      date,
      titre,
      couleur,
      passee: estPassee(date, aujourdhui),
    })
  }
  return blocs.sort((a, b) => a.date.localeCompare(b.date))
}

export function construirePointsEvaluations(
  evaluations: Pick<EvaluationAvecPlanning, 'date' | 'statut'>[],
  aujourdhui: string,
): PointEvaluation[] {
  const dates = new Set(evaluations.filter((e) => e.statut !== 'annulee').map((e) => e.date))
  return [...dates]
    .sort()
    .map((date) => ({ id: date, date, passee: estPassee(date, aujourdhui) }))
}

export interface BlocCharge {
  id: string
  semaineDebut: string
  count: number
  passee: boolean
}

/**
 * Densité globale par semaine (mode « Ma charge ») : nombre de séances et
 * évaluations actives (toutes classes confondues) dont le lundi de la
 * semaine tombe dans la plage affichée.
 */
export function construireChargeHebdomadaire(dates: string[], aujourdhui: string): BlocCharge[] {
  const comptage = new Map<string, number>()
  for (const d of dates) {
    const semaine = toISODate(lundiDeLaSemaine(d))
    comptage.set(semaine, (comptage.get(semaine) ?? 0) + 1)
  }
  return [...comptage.entries()]
    .map(([semaineDebut, count]) => ({ id: semaineDebut, semaineDebut, count, passee: estPassee(semaineDebut, aujourdhui) }))
    .sort((a, b) => a.semaineDebut.localeCompare(b.semaineDebut))
}

export interface EtiquetteAxe {
  id: string
  label: string
  colDebut: number
  colSpan: number
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

/** Étiquettes de mois pour l'axe des zooms Année et Trimestre. */
export function etiquettesMois(rangeStart: string, rangeEnd: string): EtiquetteAxe[] {
  const etiquettes: EtiquetteAxe[] = []
  const debutRange = parseISODate(rangeStart)
  const finRange = parseISODate(rangeEnd)
  let curseur = new Date(debutRange.getFullYear(), debutRange.getMonth(), 1)

  while (curseur <= finRange) {
    const finMois = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0)
    const debutEffectif = curseur < debutRange ? debutRange : curseur
    const finEffective = finMois > finRange ? finRange : finMois
    etiquettes.push({
      id: toISODate(curseur),
      label: `${MOIS_NOMS[curseur.getMonth()]} ${curseur.getFullYear()}`,
      colDebut: diffJours(rangeStart, toISODate(debutEffectif)),
      colSpan: diffJours(toISODate(debutEffectif), toISODate(finEffective)) + 1,
    })
    curseur = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1)
  }
  return etiquettes
}

/** Étiquettes de semaine pour l'axe du zoom Mois. */
export function etiquettesSemaines(rangeStart: string, rangeEnd: string): EtiquetteAxe[] {
  const etiquettes: EtiquetteAxe[] = []
  let curseur = parseISODate(rangeStart)
  const fin = parseISODate(rangeEnd)
  let colDebut = 0

  while (curseur <= fin) {
    const spanRestant = diffJours(toISODate(curseur), rangeEnd) + 1
    const span = Math.min(7, spanRestant)
    etiquettes.push({
      id: toISODate(curseur),
      label: curseur.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      colDebut,
      colSpan: span,
    })
    curseur = ajouterJours(curseur, 7)
    colDebut += 7
  }
  return etiquettes
}
