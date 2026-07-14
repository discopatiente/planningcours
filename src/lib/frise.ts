import { ajouterJours, parseISODate, toISODate } from './dates'
import { etiquettesMois } from './gantt'
import type { PeriodeCalendrier } from '../types/periodeCalendrier'
import type { EvaluationAvecPlanning } from '../types/evaluation'

// Toutes les lignes utilisent la même largeur de référence (31 jours), même
// si le mois affiché en compte moins : le 1er de chaque mois s'aligne ainsi
// verticalement d'une ligne à l'autre, comme un calendrier mural.
const JOURS_PAR_LIGNE = 31

export interface LigneFrise {
  id: string
  label: string
  debut: string
  fin: string
}

/** Une ligne par mois civil couvert par la plage — réutilise le découpage de l'axe Gantt. */
export function construireLignesFrise(dateDebut: string, dateFin: string): LigneFrise[] {
  return etiquettesMois(dateDebut, dateFin).map((e) => ({
    id: e.id,
    label: e.label,
    debut: toISODate(ajouterJours(parseISODate(dateDebut), e.colDebut)),
    fin: toISODate(ajouterJours(parseISODate(dateDebut), e.colDebut + e.colSpan - 1)),
  }))
}

function jourDuMois(date: string): number {
  return parseISODate(date).getDate()
}

export function pctJour(jour: number): number {
  return ((jour - 1) / JOURS_PAR_LIGNE) * 100
}

export function pctLargeurJours(nbJours: number): number {
  return (nbJours / JOURS_PAR_LIGNE) * 100
}

export interface PointFrise {
  id: string
  date: string
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
      evaluations: liste,
      passee: date < aujourdhui,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface ZoneFrise {
  id: string
  leftPct: number
  widthPct: number
}

/** Portion d'une période (vacances/férié) qui tombe dans la ligne du mois concerné. */
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
      return {
        id: p.id,
        leftPct: pctJour(jourDebut),
        widthPct: pctLargeurJours(jourFin - jourDebut + 1),
      }
    })
}

export interface MarqueurFrise {
  id: string
  label: string
  leftPct: number
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
      leftPct: pctJour(jourDuMois(b.debut)),
    }))
}

/** Position (pourcentage) d'aujourd'hui dans la ligne du mois concerné, si elle y tombe. */
export function pctAujourdhuiDansLigne(aujourdhui: string, ligne: Pick<LigneFrise, 'debut' | 'fin'>): number | null {
  if (aujourdhui < ligne.debut || aujourdhui > ligne.fin) return null
  return pctJour(jourDuMois(aujourdhui))
}
