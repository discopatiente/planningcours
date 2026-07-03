import { supabase } from './supabaseClient'
import type { Creneau } from '../types/creneau'

export async function fetchCreneaux(anneeScolaireId: string): Promise<Creneau[]> {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .select('*')
    .eq('annee_scolaire_id', anneeScolaireId)
  if (error) throw error
  return data
}

export async function creerCreneau(
  creneau: Omit<Creneau, 'id'>,
): Promise<Creneau> {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .insert(creneau)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function modifierCreneau(
  id: string,
  changes: Partial<Pick<Creneau, 'classe_id' | 'matiere_id' | 'frequence'>>,
): Promise<Creneau> {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function supprimerCreneau(id: string): Promise<void> {
  const { error } = await supabase.from('emploi_du_temps').delete().eq('id', id)
  if (error) throw error
}

export async function copierDepuisAnneePrecedente(
  anneeScolairePrecedenteId: string,
  anneeScolaireCibleId: string,
): Promise<Creneau[]> {
  const creneauxPrecedents = await fetchCreneaux(anneeScolairePrecedenteId)
  if (creneauxPrecedents.length === 0) return []

  const { data, error } = await supabase
    .from('emploi_du_temps')
    .insert(
      creneauxPrecedents.map((c) => ({
        annee_scolaire_id: anneeScolaireCibleId,
        jour_semaine: c.jour_semaine,
        heure_debut: c.heure_debut,
        classe_id: c.classe_id,
        matiere_id: c.matiere_id,
        frequence: c.frequence,
      })),
    )
    .select()
  if (error) throw error
  return data
}
