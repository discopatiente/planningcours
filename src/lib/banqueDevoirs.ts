import { supabase } from './supabaseClient'
import type { BanqueDevoir } from '../types/banqueDevoir'

type ChampsModifiables = Partial<
  Pick<BanqueDevoir, 'titre' | 'matiere_id' | 'niveau' | 'notion' | 'lien_sujet' | 'lien_corrige'>
>

export async function fetchBanqueDevoirs(): Promise<BanqueDevoir[]> {
  const { data, error } = await supabase.from('banque_devoirs').select('*').order('titre')
  if (error) throw error
  return data
}

export async function createBanqueDevoir(
  titre: string,
  matiereId: string,
  niveau: BanqueDevoir['niveau'],
): Promise<BanqueDevoir> {
  const { data, error } = await supabase
    .from('banque_devoirs')
    .insert({ titre, matiere_id: matiereId, niveau })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBanqueDevoir(id: string, changes: ChampsModifiables): Promise<BanqueDevoir> {
  const { data, error } = await supabase.from('banque_devoirs').update(changes).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteBanqueDevoir(id: string): Promise<void> {
  const { error } = await supabase.from('banque_devoirs').delete().eq('id', id)
  if (error) throw error
}
