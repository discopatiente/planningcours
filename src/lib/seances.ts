import { supabase } from './supabaseClient'
import type { Seance, SeanceAvecPlanning, StatutSeance } from '../types/seance'

export async function fetchSeancesPlanning(planningId: string): Promise<Seance[]> {
  const { data, error } = await supabase
    .from('seances')
    .select('*')
    .eq('planning_id', planningId)
    .order('date')
    .order('heure_debut')
  if (error) throw error
  return data
}

// Toutes les séances d'une semaine (toutes classes de l'année confondues),
// pour la vue Semaine.
export async function fetchSeancesSemaine(
  anneeScolaireId: string,
  dateDebut: string,
  dateFin: string,
): Promise<SeanceAvecPlanning[]> {
  const { data, error } = await supabase
    .from('seances')
    .select('*, planning:plannings!inner(classe_id, progression_id, annee_scolaire_id)')
    .eq('planning.annee_scolaire_id', anneeScolaireId)
    .gte('date', dateDebut)
    .lte('date', dateFin)
    .order('date')
    .order('heure_debut')
  if (error) throw error
  return data
}

export async function updateStatutSeance(id: string, statut: StatutSeance): Promise<Seance> {
  const { data, error } = await supabase
    .from('seances')
    .update({ statut })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertSeances(
  planningId: string,
  seances: { unite_id: string; date: string; heure_debut: string }[],
): Promise<Seance[]> {
  if (seances.length === 0) return []
  const { data, error } = await supabase
    .from('seances')
    .insert(
      seances.map((s) => ({
        planning_id: planningId,
        unite_id: s.unite_id,
        date: s.date,
        heure_debut: s.heure_debut,
        statut: 'a_venir' as const,
      })),
    )
    .select()
  if (error) throw error
  return data
}

export async function updateSeance(
  id: string,
  changes: Partial<
    Pick<
      Seance,
      'date' | 'heure_debut' | 'statut' | 'motif_annulation' | 'notes_seance' | 'unite_id' | 'non_terminee'
    >
  >,
): Promise<Seance> {
  const { data, error } = await supabase.from('seances').update(changes).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSeance(id: string): Promise<void> {
  const { error } = await supabase.from('seances').delete().eq('id', id)
  if (error) throw error
}

export async function insertSeanceTrouAnnule(
  planningId: string,
  date: string,
  heureDebut: string,
  motif: string | null,
): Promise<Seance> {
  const { data, error } = await supabase
    .from('seances')
    .insert({
      planning_id: planningId,
      unite_id: null,
      date,
      heure_debut: heureDebut,
      statut: 'annulee' as const,
      motif_annulation: motif,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Trou de « retard de progression » (cf. décalerProgressionRetard) —
// distinct du trou d'annulation : jamais de motif, statut `retard` plutôt
// que `annulee`, pour ne pas confondre un choix de rythme avec une vraie
// annulation.
export async function insertSeanceTrouRetard(planningId: string, date: string, heureDebut: string): Promise<Seance> {
  const { data, error } = await supabase
    .from('seances')
    .insert({
      planning_id: planningId,
      unite_id: null,
      date,
      heure_debut: heureDebut,
      statut: 'retard' as const,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface InstanceUnite {
  seanceId: string
  planningId: string
  classeId: string
  aOverride: boolean
}

// Classes utilisant cette unité dans leur planning de l'année active :
// une override est considérée présente dès qu'un des champs de contenu
// surchargeables diverge du template (titre, instruction élèves, délais).
interface LigneInstanceBrute {
  id: string
  planning_id: string
  override_titre: string | null
  override_instruction_eleves: string | null
  override_delai_impression_jours: number | null
  override_delai_eleves_jours: number | null
  planning: { classe_id: string; annee_scolaire_id: string }
}

export async function fetchInstancesUnite(uniteId: string, anneeScolaireId: string): Promise<InstanceUnite[]> {
  const { data, error } = await supabase
    .from('seances')
    .select(
      'id, planning_id, override_titre, override_instruction_eleves, override_delai_impression_jours, override_delai_eleves_jours, planning:plannings!inner(classe_id, annee_scolaire_id)',
    )
    .eq('unite_id', uniteId)
    .eq('planning.annee_scolaire_id', anneeScolaireId)
    .returns<LigneInstanceBrute[]>()
  if (error) throw error
  return data.map((s) => ({
    seanceId: s.id,
    planningId: s.planning_id,
    classeId: s.planning.classe_id,
    aOverride:
      s.override_titre !== null ||
      s.override_instruction_eleves !== null ||
      s.override_delai_impression_jours !== null ||
      s.override_delai_eleves_jours !== null,
  }))
}

// Pousse le contenu du template vers les instances des classes choisies : ne
// touche qu'aux champs de contenu (titre, instruction élèves, délais), jamais
// à la date/heure/statut. Les ressources ne sont pas dupliquées par séance —
// elles sont déjà lues directement depuis l'unité, donc toujours à jour sans
// action de push.
export async function pousserTemplateVersInstances(
  uniteId: string,
  classeIds: string[],
  anneeScolaireId: string,
): Promise<number> {
  if (classeIds.length === 0) return 0
  const { data: cibles, error: selectError } = await supabase
    .from('seances')
    .select('id, planning:plannings!inner(classe_id, annee_scolaire_id)')
    .eq('unite_id', uniteId)
    .eq('planning.annee_scolaire_id', anneeScolaireId)
    .in('planning.classe_id', classeIds)
  if (selectError) throw selectError

  const seanceIds = cibles.map((s) => s.id)
  if (seanceIds.length === 0) return 0

  const { error: updateError } = await supabase
    .from('seances')
    .update({
      override_titre: null,
      override_instruction_eleves: null,
      override_delai_impression_jours: null,
      override_delai_eleves_jours: null,
    })
    .in('id', seanceIds)
  if (updateError) throw updateError
  return seanceIds.length
}

export async function insertSeanceExceptionnelle(
  planningId: string,
  uniteId: string | null,
  date: string,
  heureDebut: string,
): Promise<Seance> {
  const { data, error } = await supabase
    .from('seances')
    .insert({
      planning_id: planningId,
      unite_id: uniteId,
      date,
      heure_debut: heureDebut,
      statut: 'a_venir' as const,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
