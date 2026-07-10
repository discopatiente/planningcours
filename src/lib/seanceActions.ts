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
  updateSeance,
} from './seances'
import { genererDatesCreneaux, type CreneauDate } from './projectionEngine'
import { estApres } from './dates'

function cleCreneau(date: string, heureDebut: string): string {
  return `${date}|${heureDebut}`
}

// Séances `a_venir` du planning strictement après `seance`, triées
// chronologiquement — la chaîne de base de tous les recalculs en cascade.
function seancesSuivantes(seancesPlanning: Seance[], seance: Seance): Seance[] {
  return seancesPlanning
    .filter((s) => s.statut === 'a_venir' && s.id !== seance.id)
    .filter((s) => estApres(s, seance))
    .sort((a, b) => (a.date === b.date ? a.heure_debut.localeCompare(b.heure_debut) : a.date.localeCompare(b.date)))
}

/**
 * Décale d'un cran vers plus tard toutes les séances `a_venir` du planning à
 * partir de `seance` incluse : le créneau de `seance` glisse sur celui de la
 * suivante, celui-ci sur le suivant, etc., jusqu'à la dernière qui récupère
 * le premier créneau libre restant dans l'année — ou passe en excédent si
 * aucun n'est disponible (débordement non bloquant). Les séances déjà
 * `fait` ou `deplacee` ne participent pas au glissement. Ne pose pas le
 * trou au créneau d'origine de `seance` : c'est à l'appelant de le faire
 * (utilisée uniquement par `annulerSeance`).
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

  const suivantes = seancesSuivantes(seancesPlanning, seance)

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
 * « Besoin d'une séance de plus sur cette unité » : `seance` n'est jamais
 * modifiée (elle a réellement eu lieu). Toutes les séances `a_venir`
 * suivantes reculent d'un cran, et le créneau ainsi libéré juste après
 * `seance` reçoit une nouvelle séance portant la même unité — une vraie
 * poursuite, jamais un créneau vide. Symétrique de `avancerProgression`.
 */
export async function ajouterSeanceRepetition(
  seance: Seance,
  classeId: string,
  matiereId: string,
  anneeScolaire: AnneeScolaire,
): Promise<void> {
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

  const suivantes = seancesSuivantes(seancesPlanning, seance)

  // Le créneau juste après `seance` se libère pour la répétition : celui
  // qu'occupait la première suivante (qui elle-même avance d'un cran), ou un
  // nouveau créneau du pool si `seance` était la dernière séance a_venir du
  // planning.
  const creneauRepetition: CreneauDate | undefined =
    suivantes.length > 0
      ? { date: suivantes[0].date, heure_debut: suivantes[0].heure_debut }
      : pool.find((d) => estApres(d, seance) && !occupees.has(cleCreneau(d.date, d.heure_debut)))

  const cibles: CreneauDate[] = suivantes.slice(1).map((s) => ({ date: s.date, heure_debut: s.heure_debut }))
  const derniereDate = suivantes.length > 0 ? suivantes[suivantes.length - 1] : seance
  const nouveauCreneauLibre = pool.find((d) => estApres(d, derniereDate) && !occupees.has(cleCreneau(d.date, d.heure_debut)))
  if (nouveauCreneauLibre) cibles.push(nouveauCreneauLibre)

  let nbEnExcesSupplementaire = 0
  for (let i = 0; i < suivantes.length; i++) {
    if (i < cibles.length) {
      await updateSeance(suivantes[i].id, { date: cibles[i].date, heure_debut: cibles[i].heure_debut })
    } else {
      await deleteSeance(suivantes[i].id)
      nbEnExcesSupplementaire += 1
    }
  }

  if (creneauRepetition) {
    await insertSeanceExceptionnelle(seance.planning_id, seance.unite_id, creneauRepetition.date, creneauRepetition.heure_debut)
  } else {
    nbEnExcesSupplementaire += 1
  }

  if (nbEnExcesSupplementaire > 0) {
    const planning = await fetchPlanningById(seance.planning_id)
    await updateNbSeancesEnExces(planning.id, planning.nb_seances_en_exces + nbEnExcesSupplementaire)
  }
}

/**
 * « J'ai de l'avance — la séance suivante est déjà couverte » : la séance
 * `a_venir` immédiatement après `seance` devient inutile. Elle n'est jamais
 * supprimée (pour ne pas risquer qu'un futur débordement de progression la
 * reproduise en la croyant non placée) : elle passe `fait`, ramenée à la
 * date de `seance`. Toutes les séances `a_venir` après elle remontent d'un
 * cran pour combler la place ; le créneau libéré en bout de chaîne récupère
 * la prochaine unité non placée de la progression si le planning a des
 * séances en excédent, sinon reste vide. Symétrique de
 * `ajouterSeanceRepetition`. Ne fait rien si `seance` est la dernière du
 * planning (rien à absorber).
 */
export async function avancerProgression(seance: Seance, progressionId: string): Promise<void> {
  const [seancesPlanning, planning, progressionUnites] = await Promise.all([
    fetchSeancesPlanning(seance.planning_id),
    fetchPlanningById(seance.planning_id),
    fetchProgressionUnites(progressionId),
  ])

  const suivantes = seancesSuivantes(seancesPlanning, seance)
  if (suivantes.length === 0) return

  const [cible, ...apresCible] = suivantes

  const cibles: CreneauDate[] = [
    { date: cible.date, heure_debut: cible.heure_debut },
    ...apresCible.slice(0, -1).map((s) => ({ date: s.date, heure_debut: s.heure_debut })),
  ]
  for (let i = 0; i < apresCible.length; i++) {
    await updateSeance(apresCible[i].id, { date: cibles[i].date, heure_debut: cibles[i].heure_debut })
  }

  await updateSeance(cible.id, { statut: 'fait', date: seance.date, heure_debut: seance.heure_debut })

  const creneauLibere = apresCible.length > 0 ? apresCible[apresCible.length - 1] : cible
  if (planning.nb_seances_en_exces > 0) {
    const uniteIdsPlacees = new Set(seancesPlanning.filter((s) => s.unite_id).map((s) => s.unite_id))
    const prochaineUnite = progressionUnites.find((pu) => !uniteIdsPlacees.has(pu.unite_id))
    if (prochaineUnite) {
      await insertSeanceExceptionnelle(
        seance.planning_id,
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
