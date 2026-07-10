import { supabase } from './supabaseClient'
import type { AbsenceEvaluation } from '../types/absence'
import type { Eleve } from '../types/eleve'

export interface EvaluationLibelle {
  id: string
  titre: string | null
  date: string
}

export interface PresenceEleve {
  eleveId: string
  nomComplet: string
  absent: boolean
  verrouille: boolean
}

export interface RattrapageDisponible {
  absenceId: string
  eleveId: string
  nomComplet: string
  libelle: string
  dejaAttache: boolean
}

export function libelleDevoir(titre: string | null, date: string): string {
  const dateFormatee = new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return titre ?? `Devoir du ${dateFormatee}`
}

function nomComplet(eleve: Eleve): string {
  return `${eleve.prenom} ${eleve.nom}`
}

// Présence de chaque élève de la classe pour une évaluation donnée : absent
// si une ligne existe, verrouillé (non modifiable depuis ce panneau) si
// cette absence est déjà attachée à un créneau de rattrapage.
export function construirePresences(
  classeEleves: Eleve[],
  evaluationId: string,
  absences: AbsenceEvaluation[],
): PresenceEleve[] {
  return classeEleves.map((e) => {
    const ligne = absences.find((a) => a.evaluation_id === evaluationId && a.eleve_id === e.id)
    return {
      eleveId: e.id,
      nomComplet: nomComplet(e),
      absent: !!ligne,
      verrouille: !!ligne?.rattrapage_seance_id,
    }
  })
}

// Rattrapages en attente pour une classe (aucun créneau de rattrapage
// encore attaché) — utilisé par l'onglet Élèves.
export function rattrapagesEnAttente(
  classeId: string,
  absences: AbsenceEvaluation[],
  eleves: Eleve[],
  evaluations: EvaluationLibelle[],
): RattrapageDisponible[] {
  const elevesParId = new Map(eleves.map((e) => [e.id, e]))
  const evaluationsParId = new Map(evaluations.map((e) => [e.id, e]))
  return absences
    .filter((a) => a.rattrapage_seance_id === null && elevesParId.get(a.eleve_id)?.classe_id === classeId)
    .map((a) => {
      const eleve = elevesParId.get(a.eleve_id)
      const evaluation = evaluationsParId.get(a.evaluation_id)
      return {
        absenceId: a.id,
        eleveId: a.eleve_id,
        nomComplet: eleve ? nomComplet(eleve) : '?',
        libelle: evaluation ? libelleDevoir(evaluation.titre, evaluation.date) : '(devoir supprimé)',
        dejaAttache: false,
      }
    })
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet))
}

// Rattrapages proposables pour un créneau de cours donné : ceux en attente
// pour la classe, plus ceux déjà attachés à ce créneau (pour permettre de
// les détacher depuis le même panneau).
export function rattrapagesPourSeance(
  seanceId: string,
  classeId: string,
  absences: AbsenceEvaluation[],
  eleves: Eleve[],
  evaluations: EvaluationLibelle[],
): RattrapageDisponible[] {
  const elevesParId = new Map(eleves.map((e) => [e.id, e]))
  const evaluationsParId = new Map(evaluations.map((e) => [e.id, e]))
  return absences
    .filter((a) => a.rattrapage_seance_id === null || a.rattrapage_seance_id === seanceId)
    .filter((a) => elevesParId.get(a.eleve_id)?.classe_id === classeId)
    .map((a) => {
      const eleve = elevesParId.get(a.eleve_id)
      const evaluation = evaluationsParId.get(a.evaluation_id)
      return {
        absenceId: a.id,
        eleveId: a.eleve_id,
        nomComplet: eleve ? nomComplet(eleve) : '?',
        libelle: evaluation ? libelleDevoir(evaluation.titre, evaluation.date) : '(devoir supprimé)',
        dejaAttache: a.rattrapage_seance_id === seanceId,
      }
    })
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet))
}

export function seancesAvecRattrapage(absences: AbsenceEvaluation[]): Set<string> {
  const set = new Set<string>()
  for (const a of absences) if (a.rattrapage_seance_id) set.add(a.rattrapage_seance_id)
  return set
}

export async function fetchAbsences(): Promise<AbsenceEvaluation[]> {
  const { data, error } = await supabase.from('absences_evaluation').select('*')
  if (error) throw error
  return data
}

export async function insertAbsences(evaluationId: string, eleveIds: string[]): Promise<void> {
  if (eleveIds.length === 0) return
  const { error } = await supabase
    .from('absences_evaluation')
    .insert(eleveIds.map((eleve_id) => ({ evaluation_id: evaluationId, eleve_id })))
  if (error) throw error
}

export async function deleteAbsences(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('absences_evaluation').delete().in('id', ids)
  if (error) throw error
}

export async function attacherRattrapage(ids: string[], seanceId: string): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('absences_evaluation')
    .update({ rattrapage_seance_id: seanceId })
    .in('id', ids)
  if (error) throw error
}

export async function detacherRattrapage(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('absences_evaluation')
    .update({ rattrapage_seance_id: null })
    .in('id', ids)
  if (error) throw error
}
