import type { AnneeScolaire } from '../types/anneeScolaire'
import type { Seance } from '../types/seance'
import { fetchCreneaux } from './emploiDuTemps'
import { fetchPeriodesCalendrier } from './periodesCalendrier'
import { fetchProgressionUnites } from './progressionUnites'
import { fetchEvaluationsPlanning } from './evaluations'
import { fetchPlanningById, updateNbSeancesEnExces } from './plannings'
import {
  deleteSeance,
  fetchSeancesPlanning,
  insertSeanceExceptionnelle,
  insertSeanceTrouAnnule,
  insertSeanceTrouRetard,
  updateSeance,
} from './seances'
import { genererDatesCreneaux, type CreneauDate } from './projectionEngine'
import { estApres } from './dates'

function cleCreneau(date: string, heureDebut: string): string {
  return `${date}|${heureDebut}`
}

/**
 * Décale d'un cran vers plus tard toutes les séances `a_venir` du planning à
 * partir de `seance` incluse : le créneau de `seance` glisse sur celui de la
 * suivante, celui-ci sur le suivant, etc., jusqu'à la dernière qui récupère
 * le premier créneau libre restant dans l'année — ou passe en excédent si
 * aucun n'est disponible (débordement non bloquant). Les séances déjà
 * `fait` ou `deplacee` ne participent pas au glissement. Ne pose pas le
 * trou au créneau d'origine de `seance` : c'est à l'appelant de choisir le
 * type de trou (annulation ou retard de progression).
 */
async function decalerChaineEnAvant(
  seance: Seance,
  classeId: string,
  matiereId: string,
  anneeScolaire: AnneeScolaire,
): Promise<number> {
  const [creneauxAnnee, periodes, seancesPlanning, evaluationsPlanning] = await Promise.all([
    fetchCreneaux(anneeScolaire.id),
    fetchPeriodesCalendrier(anneeScolaire.id),
    fetchSeancesPlanning(seance.planning_id),
    fetchEvaluationsPlanning(seance.planning_id),
  ])

  const creneaux = creneauxAnnee.filter((c) => c.classe_id === classeId && c.matiere_id === matiereId)
  const pool = genererDatesCreneaux(creneaux, anneeScolaire, periodes)

  const occupees = new Set<string>()
  for (const s of seancesPlanning) occupees.add(cleCreneau(s.date, s.heure_debut))
  for (const e of evaluationsPlanning) occupees.add(cleCreneau(e.date, e.heure_debut))

  const suivantes = seancesPlanning
    .filter((s) => s.statut === 'a_venir' && s.id !== seance.id)
    .filter((s) => estApres(s, seance))
    .sort((a, b) => (a.date === b.date ? a.heure_debut.localeCompare(b.heure_debut) : a.date.localeCompare(b.date)))

  const chaine = [seance, ...suivantes]
  const cibles: CreneauDate[] = suivantes.map((s) => ({ date: s.date, heure_debut: s.heure_debut }))

  const derniereDate = suivantes.length > 0 ? suivantes[suivantes.length - 1] : seance
  const prochainCreneauLibre = pool.find((d) => estApres(d, derniereDate) && !occupees.has(cleCreneau(d.date, d.heure_debut)))
  if (prochainCreneauLibre) cibles.push(prochainCreneauLibre)

  let nbEnExcesSupplementaire = 0
  for (let i = 0; i < chaine.length; i++) {
    if (i < cibles.length) {
      await updateSeance(chaine[i].id, { date: cibles[i].date, heure_debut: cibles[i].heure_debut })
    } else {
      await deleteSeance(chaine[i].id)
      nbEnExcesSupplementaire += 1
    }
  }

  return nbEnExcesSupplementaire
}

/**
 * Annule une séance et déclenche le recalcul en cascade : le créneau annulé
 * devient un trou (nouvelle séance sans unité, statut `annulee`, motif
 * affiché), et le contenu (unité + overrides + notes) de chaque séance
 * suivante du planning glisse d'un cran vers le créneau suivant.
 */
export async function annulerSeance(
  seance: Seance,
  motif: string | null,
  classeId: string,
  matiereId: string,
  anneeScolaire: AnneeScolaire,
): Promise<void> {
  const nbEnExcesSupplementaire = await decalerChaineEnAvant(seance, classeId, matiereId, anneeScolaire)
  await insertSeanceTrouAnnule(seance.planning_id, seance.date, seance.heure_debut, motif)
  if (nbEnExcesSupplementaire > 0) {
    const planning = await fetchPlanningById(seance.planning_id)
    await updateNbSeancesEnExces(planning.id, planning.nb_seances_en_exces + nbEnExcesSupplementaire)
  }
}

/**
 * Décale toute la suite de la progression d'un cran vers plus tard pour
 * rattraper un retard trop important — même mécanique que `annulerSeance`,
 * mais pose un trou de statut `retard` plutôt que `annulee` : ce n'est pas
 * une vraie annulation (pas de motif), juste un choix de rythme. Symétrique
 * de `rattraperRetard`, qui inverse ce décalage.
 */
export async function decalerProgressionRetard(
  seance: Seance,
  classeId: string,
  matiereId: string,
  anneeScolaire: AnneeScolaire,
): Promise<void> {
  const nbEnExcesSupplementaire = await decalerChaineEnAvant(seance, classeId, matiereId, anneeScolaire)
  await insertSeanceTrouRetard(seance.planning_id, seance.date, seance.heure_debut)
  if (nbEnExcesSupplementaire > 0) {
    const planning = await fetchPlanningById(seance.planning_id)
    await updateNbSeancesEnExces(planning.id, planning.nb_seances_en_exces + nbEnExcesSupplementaire)
  }
}

/**
 * Inverse un décalage de retard : supprime le trou `retard` désigné et
 * remonte d'un cran toutes les séances `a_venir` qui le suivent pour combler
 * la place. Le créneau libéré en bout de chaîne récupère la prochaine unité
 * non placée de la progression si le planning a des séances en excédent
 * (symétrique de `ajouterSeanceExceptionnelle`), sinon il reste simplement
 * vide. N'agit que sur un trou `retard` — jamais sur une vraie annulation,
 * pour garder les deux mécanismes séparés.
 */
export async function rattraperRetard(trou: Seance, progressionId: string): Promise<void> {
  const [seancesPlanning, planning, progressionUnites] = await Promise.all([
    fetchSeancesPlanning(trou.planning_id),
    fetchPlanningById(trou.planning_id),
    fetchProgressionUnites(progressionId),
  ])

  const suivantes = seancesPlanning
    .filter((s) => s.statut === 'a_venir')
    .filter((s) => estApres(s, trou))
    .sort((a, b) => (a.date === b.date ? a.heure_debut.localeCompare(b.heure_debut) : a.date.localeCompare(b.date)))

  const cibles: CreneauDate[] = [
    { date: trou.date, heure_debut: trou.heure_debut },
    ...suivantes.slice(0, -1).map((s) => ({ date: s.date, heure_debut: s.heure_debut })),
  ]
  for (let i = 0; i < suivantes.length; i++) {
    await updateSeance(suivantes[i].id, { date: cibles[i].date, heure_debut: cibles[i].heure_debut })
  }
  await deleteSeance(trou.id)

  const creneauLibere = suivantes.length > 0 ? suivantes[suivantes.length - 1] : trou
  if (planning.nb_seances_en_exces > 0) {
    const uniteIdsPlacees = new Set(seancesPlanning.filter((s) => s.unite_id).map((s) => s.unite_id))
    const prochaineUnite = progressionUnites.find((pu) => !uniteIdsPlacees.has(pu.unite_id))
    if (prochaineUnite) {
      await insertSeanceExceptionnelle(
        trou.planning_id,
        prochaineUnite.unite_id,
        creneauLibere.date,
        creneauLibere.heure_debut,
      )
      await updateNbSeancesEnExces(planning.id, planning.nb_seances_en_exces - 1)
    }
  }
}

/**
 * Déplace une séance vers une nouvelle date/heure librement choisie, sans
 * toucher aux autres séances du planning (contrairement à l'annulation, qui
 * décale tout le monde). Aucun contrôle de conflit bloquant : conforme à la
 * règle « débordement non bloquant » du projet.
 */
export async function deplacerSeance(seanceId: string, date: string, heureDebut: string): Promise<void> {
  await updateSeance(seanceId, { date, heure_debut: heureDebut, statut: 'deplacee' })
}

/**
 * Ajoute une séance exceptionnelle hors emploi du temps normal, en reprenant
 * automatiquement la prochaine unité de la progression pas encore
 * programmée dans ce planning (typiquement une unité en excédent) — et
 * décrémente le compteur de débordement du planning en conséquence.
 */
export async function ajouterSeanceExceptionnelle(
  planningId: string,
  progressionId: string,
  date: string,
  heureDebut: string,
): Promise<Seance> {
  const [progressionUnites, seancesPlanning, planning] = await Promise.all([
    fetchProgressionUnites(progressionId),
    fetchSeancesPlanning(planningId),
    fetchPlanningById(planningId),
  ])

  const uniteIdsPlacees = new Set(seancesPlanning.filter((s) => s.unite_id).map((s) => s.unite_id))
  const prochaineUnite = progressionUnites.find((pu) => !uniteIdsPlacees.has(pu.unite_id))

  const seance = await insertSeanceExceptionnelle(planningId, prochaineUnite?.unite_id ?? null, date, heureDebut)

  if (prochaineUnite && planning.nb_seances_en_exces > 0) {
    await updateNbSeancesEnExces(planning.id, planning.nb_seances_en_exces - 1)
  }

  return seance
}
