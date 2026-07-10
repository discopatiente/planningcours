import type { AnneeScolaire } from '../types/anneeScolaire'
import type { Creneau } from '../types/creneau'
import type { PeriodeCalendrier } from '../types/periodeCalendrier'
import { calculerSemaine, lundiDeLaSemaine } from './semaineAB'
import { ajouterJours, toISODate } from './dates'

export interface CreneauDate {
  date: string
  heure_debut: string
}

function dateDansPeriode(date: string, periodes: PeriodeCalendrier[]): boolean {
  return periodes.some((p) => p.date_debut <= date && date <= p.date_fin)
}

/**
 * Liste toutes les dates de cours de l'année pour un couple classe/matière
 * donné : un jour par occurrence de créneau dans l'emploi du temps, en
 * excluant les vacances/fériés et en respectant l'alternance semaine A/B.
 * Les créneaux `semaine_a`/`semaine_b` sont ignorés si aucune référence de
 * semaine A n'est définie pour l'année (débordement non bloquant plutôt
 * qu'une erreur).
 */
export function genererDatesCreneaux(
  creneaux: Creneau[],
  anneeScolaire: AnneeScolaire,
  periodes: PeriodeCalendrier[],
): CreneauDate[] {
  const resultat: CreneauDate[] = []
  const fin = new Date(`${anneeScolaire.date_fin}T00:00:00`)

  for (
    let courant = new Date(`${anneeScolaire.date_debut}T00:00:00`);
    courant <= fin;
    courant = ajouterJours(courant, 1)
  ) {
    const jourJs = courant.getDay()
    if (jourJs < 1 || jourJs > 5) continue
    const jourSemaine = jourJs - 1
    const dateStr = toISODate(courant)
    if (dateDansPeriode(dateStr, periodes)) continue

    const creneauxDuJour = creneaux
      .filter((c) => c.jour_semaine === jourSemaine)
      .filter((c) => {
        if (c.frequence === 'toutes_les_semaines') return true
        const semaine = calculerSemaine(dateStr, anneeScolaire.reference_semaine_a_date)
        if (semaine === null) return false
        return c.frequence === 'semaine_a' ? semaine === 'A' : semaine === 'B'
      })
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))

    for (const c of creneauxDuJour) {
      resultat.push({ date: dateStr, heure_debut: c.heure_debut })
    }
  }

  return resultat
}

/**
 * Distribue les unités d'une progression, dans l'ordre, une par créneau
 * disponible. En cas de débordement (plus d'unités que de créneaux), les
 * unités en trop ne sont pas placées — seulement comptées, cf. règle
 * « débordement non bloquant ».
 */
export function distribuerUnites(
  uniteIds: string[],
  datesDisponibles: CreneauDate[],
): { seances: { unite_id: string; date: string; heure_debut: string }[]; nbSeancesEnExces: number } {
  const n = Math.min(uniteIds.length, datesDisponibles.length)
  const seances = uniteIds
    .slice(0, n)
    .map((unite_id, i) => ({ unite_id, date: datesDisponibles[i].date, heure_debut: datesDisponibles[i].heure_debut }))
  return { seances, nbSeancesEnExces: Math.max(0, uniteIds.length - datesDisponibles.length) }
}

interface BorneTrimestre {
  trimestre: 1 | 2 | 3
  debut: string
  fin: string
}

/**
 * Bornes des 3 trimestres pour l'année. Utilise les dates configurées
 * (trimestre_2_debut/trimestre_3_debut) si présentes ; à défaut, découpe
 * l'année en 3 tiers égaux (non bloquant : la répartition des évaluations
 * fonctionne même sans configuration explicite).
 */
export function bornesTrimestres(anneeScolaire: AnneeScolaire): BorneTrimestre[] {
  const debut = new Date(`${anneeScolaire.date_debut}T00:00:00`)
  const fin = new Date(`${anneeScolaire.date_fin}T00:00:00`)
  const dureeJours = Math.round((fin.getTime() - debut.getTime()) / 86_400_000)

  const t2 =
    anneeScolaire.trimestre_2_debut ?? toISODate(ajouterJours(debut, Math.round(dureeJours / 3)))
  const t3 =
    anneeScolaire.trimestre_3_debut ?? toISODate(ajouterJours(debut, Math.round((2 * dureeJours) / 3)))

  return [
    { trimestre: 1, debut: anneeScolaire.date_debut, fin: t2 },
    { trimestre: 2, debut: t2, fin: t3 },
    { trimestre: 3, debut: t3, fin: anneeScolaire.date_fin },
  ]
}

export function cleCreneauDate(d: CreneauDate): string {
  return `${d.date}|${d.heure_debut}`
}

/**
 * Cherche, à partir de `indexDepart`, le premier créneau du pool qui n'est
 * pas réservé. Règle « flexible » : une première passe respecte le plafond
 * max_evaluations_semaine (ignoré d'emblée si `matiereExclueDuPlafond`,
 * cf. exclusion SNT) ; si aucun créneau ne le respecte d'ici la fin de
 * l'année, une seconde passe l'ignore complètement plutôt que de ne pas
 * placer l'évaluation — le plafond est une préférence, jamais bloquant.
 */
export function trouverCreneauEvaluation(
  datesDisponibles: CreneauDate[],
  indexDepart: number,
  reservees: Set<string>,
  comptageParSemaine: Map<string, number>,
  maxEvaluationsSemaine: number,
  matiereExclueDuPlafond: boolean,
): CreneauDate | null {
  for (const respecterPlafond of matiereExclueDuPlafond ? [false] : [true, false]) {
    for (let i = Math.max(indexDepart, 0); i < datesDisponibles.length; i++) {
      const candidat = datesDisponibles[i]
      const cle = cleCreneauDate(candidat)
      if (reservees.has(cle)) continue
      if (respecterPlafond) {
        const semaine = toISODate(lundiDeLaSemaine(candidat.date))
        if ((comptageParSemaine.get(semaine) ?? 0) >= maxEvaluationsSemaine) continue
      }
      return candidat
    }
  }
  return null
}

/**
 * Place les évaluations d'un planning en réservant des créneaux parmi ceux
 * disponibles pour la classe, réparties par trimestre. Respecte la règle
 * max_evaluations_semaine toutes classes confondues : si la semaine visée
 * est déjà pleine (comptage `evaluationsExistantes` + celles déjà placées
 * dans cet appel), l'évaluation est décalée au prochain créneau disponible
 * — et si aucun créneau de l'année ne respecte le plafond, il est ignoré
 * plutôt que de perdre l'évaluation (règle flexible, cf. `trouverCreneauEvaluation`).
 * Les évaluations d'une matière exclue (`matiereExclueDuPlafond`, ex. SNT) ne
 * comptent jamais dans le plafond et ne sont jamais bloquées par lui.
 */
export function placerEvaluations(
  datesDisponibles: CreneauDate[],
  anneeScolaire: AnneeScolaire,
  evaluationsParTrimestre: number,
  maxEvaluationsSemaine: number,
  evaluationsExistantes: { date: string; matiereExclue: boolean }[],
  matiereExclueDuPlafond: boolean = false,
): { date: string; heure_debut: string; trimestre: 1 | 2 | 3 }[] {
  if (evaluationsParTrimestre <= 0) return []

  const comptageParSemaine = new Map<string, number>()
  for (const ev of evaluationsExistantes) {
    if (ev.matiereExclue) continue
    const semaine = toISODate(lundiDeLaSemaine(ev.date))
    comptageParSemaine.set(semaine, (comptageParSemaine.get(semaine) ?? 0) + 1)
  }

  const reservees = new Set<string>()
  const resultat: { date: string; heure_debut: string; trimestre: 1 | 2 | 3 }[] = []

  for (const borne of bornesTrimestres(anneeScolaire)) {
    const datesTrimestre = datesDisponibles.filter((d) => d.date >= borne.debut && d.date < borne.fin)
    if (datesTrimestre.length === 0) continue

    for (let k = 0; k < evaluationsParTrimestre; k++) {
      const indexCible = Math.min(
        datesTrimestre.length - 1,
        Math.floor(((k + 0.5) * datesTrimestre.length) / evaluationsParTrimestre),
      )

      // Cherche à partir de l'index cible, dans tout le pool restant de
      // l'année (pas seulement le trimestre).
      const indexGlobalDepart = datesDisponibles.indexOf(datesTrimestre[indexCible])
      const place = trouverCreneauEvaluation(
        datesDisponibles,
        indexGlobalDepart,
        reservees,
        comptageParSemaine,
        maxEvaluationsSemaine,
        matiereExclueDuPlafond,
      )
      if (!place) continue

      reservees.add(cleCreneauDate(place))
      if (!matiereExclueDuPlafond) {
        const semaine = toISODate(lundiDeLaSemaine(place.date))
        comptageParSemaine.set(semaine, (comptageParSemaine.get(semaine) ?? 0) + 1)
      }
      resultat.push({ date: place.date, heure_debut: place.heure_debut, trimestre: borne.trimestre })
    }
  }

  return resultat
}

export interface ResultatProjection {
  seances: { unite_id: string; date: string; heure_debut: string }[]
  evaluations: { date: string; heure_debut: string; trimestre: 1 | 2 | 3 }[]
  nbSeancesEnExces: number
}

/**
 * Orchestration pure du moteur de projection : à partir des créneaux
 * disponibles pour la classe/matière, réserve d'abord les créneaux
 * d'évaluations puis distribue les unités de la progression dans le reste.
 */
export function projeter(
  uniteIds: string[],
  creneaux: Creneau[],
  anneeScolaire: AnneeScolaire,
  periodes: PeriodeCalendrier[],
  evaluationsParTrimestre: number,
  maxEvaluationsSemaine: number,
  evaluationsExistantes: { date: string; matiereExclue: boolean }[],
  matiereExclueDuPlafond: boolean = false,
): ResultatProjection {
  const datesDisponibles = genererDatesCreneaux(creneaux, anneeScolaire, periodes)
  const evaluations = placerEvaluations(
    datesDisponibles,
    anneeScolaire,
    evaluationsParTrimestre,
    maxEvaluationsSemaine,
    evaluationsExistantes,
    matiereExclueDuPlafond,
  )
  const clesReservees = new Set(evaluations.map((e) => cleCreneauDate(e)))
  const datesPourUnites = datesDisponibles.filter((d) => !clesReservees.has(cleCreneauDate(d)))
  const { seances, nbSeancesEnExces } = distribuerUnites(uniteIds, datesPourUnites)

  return { seances, evaluations, nbSeancesEnExces }
}
