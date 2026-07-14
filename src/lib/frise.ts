import { ajouterJours, parseISODate, toISODate } from './dates'
import { etiquettesMois } from './gantt'
import type { PeriodeCalendrier } from '../types/periodeCalendrier'
import type { EvaluationAvecPlanning } from '../types/evaluation'

export interface LigneFrise {
  id: string
  label: string
  debut: string
  fin: string
  jourDebut: number
  jourFin: number
}

function jourDuMois(date: string): number {
  return parseISODate(date).getDate()
}

// Pas de cours en juillet/août : même si l'année scolaire configurée
// s'étend par défaut jusqu'à fin août, ces deux mois ne doivent jamais
// apparaitre sur la frise.
const MOIS_ETE_EXCLUS = [6, 7] // juillet, août (0-indexé)

/** Une ligne par mois civil couvert par la plage (hors juillet/août) — réutilise le découpage de l'axe Gantt. */
export function construireLignesFrise(dateDebut: string, dateFin: string): LigneFrise[] {
  return etiquettesMois(dateDebut, dateFin)
    .map((e) => {
      const debut = toISODate(ajouterJours(parseISODate(dateDebut), e.colDebut))
      const fin = toISODate(ajouterJours(parseISODate(dateDebut), e.colDebut + e.colSpan - 1))
      return { id: e.id, label: e.label, debut, fin, jourDebut: jourDuMois(debut), jourFin: jourDuMois(fin) }
    })
    .filter((ligne) => !MOIS_ETE_EXCLUS.includes(parseISODate(ligne.debut).getMonth()))
}

export interface PointFrise {
  id: string
  date: string
  jour: number
  evaluations: EvaluationAvecPlanning[]
  passee: boolean
}

/** Regroupe par jour les évaluations (toutes classes confondues) qui tombent dans la ligne du mois concerné. */
export function construirePointsFrise(
  evaluations: EvaluationAvecPlanning[],
  ligne: Pick<LigneFrise, 'debut' | 'fin'>,
  aujourdhui: string,
): PointFrise[] {
  const parDate = new Map<string, EvaluationAvecPlanning[]>()
  for (const e of evaluations) {
    if (e.statut === 'annulee') continue
    if (e.date < ligne.debut || e.date > ligne.fin) continue
    const liste = parDate.get(e.date) ?? []
    liste.push(e)
    parDate.set(e.date, liste)
  }
  return [...parDate.entries()]
    .map(([date, liste]) => ({
      id: date,
      date,
      jour: jourDuMois(date),
      evaluations: liste,
      passee: date < aujourdhui,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface ZoneFrise {
  id: string
  jourDebut: number
  nbJours: number
}

/** Portion (en jours du mois) d'une période (vacances/férié) qui tombe dans la ligne du mois concerné. */
export function construireZonesFrise(
  periodes: Pick<PeriodeCalendrier, 'id' | 'date_debut' | 'date_fin'>[],
  ligne: Pick<LigneFrise, 'debut' | 'fin'>,
): ZoneFrise[] {
  return periodes
    .filter((p) => p.date_fin >= ligne.debut && p.date_debut <= ligne.fin)
    .map((p) => {
      const debut = p.date_debut < ligne.debut ? ligne.debut : p.date_debut
      const fin = p.date_fin > ligne.fin ? ligne.fin : p.date_fin
      const jourDebut = jourDuMois(debut)
      const jourFin = jourDuMois(fin)
      return { id: p.id, jourDebut, nbJours: jourFin - jourDebut + 1 }
    })
}

export interface MarqueurFrise {
  id: string
  label: string
  jour: number
}

/**
 * Marqueurs de début de trimestre qui tombent dans la ligne du mois
 * concerné. Le trimestre 1 commence avec l'année scolaire elle-même : pas
 * besoin de le marquer, seuls les débuts des trimestres 2 et 3 sont utiles.
 */
export function construireMarqueursTrimestre(
  bornes: { trimestre: 1 | 2 | 3; debut: string }[],
  ligne: Pick<LigneFrise, 'debut' | 'fin'>,
): MarqueurFrise[] {
  return bornes
    .filter((b) => b.trimestre !== 1 && b.debut >= ligne.debut && b.debut <= ligne.fin)
    .map((b) => ({
      id: `trimestre-${b.trimestre}`,
      label: `Trimestre ${b.trimestre}`,
      jour: jourDuMois(b.debut),
    }))
}

/** Jour du mois où tombe aujourd'hui, si elle est dans la ligne concernée. */
export function jourAujourdhuiDansLigne(aujourdhui: string, ligne: Pick<LigneFrise, 'debut' | 'fin'>): number | null {
  if (aujourdhui < ligne.debut || aujourdhui > ligne.fin) return null
  return jourDuMois(aujourdhui)
}
