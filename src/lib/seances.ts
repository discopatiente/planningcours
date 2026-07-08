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
    Pick<Seance, 'date' | 'heure_debut' | 'statut' | 'motif_annulation' | 'notes_seance' | 'unite_id'>
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
