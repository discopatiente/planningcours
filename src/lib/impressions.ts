import { supabase } from './supabaseClient'
import type { EtatRessourceSeance } from '../types/impression'
import type { Ressource, TypeRessource } from '../types/ressource'

// Types de ressources physiquement imprimés et distribués en classe — les
// liens externes (vidéo, lien utile) n'ont pas leur place dans l'onglet
// Impressions.
export const TYPES_RESSOURCES_IMPRIMABLES: TypeRessource[] = ['support', 'exercice', 'devoir_possible']

export function construireRessourcesImprimablesParUnite(ressources: Ressource[]): Map<string, Ressource[]> {
  const map = new Map<string, Ressource[]>()
  for (const r of ressources) {
    if (!TYPES_RESSOURCES_IMPRIMABLES.includes(r.type)) continue
    const liste = map.get(r.unite_id) ?? []
    liste.push(r)
    map.set(r.unite_id, liste)
  }
  return map
}

export function cleEtatRessourceSeance(seanceId: string, ressourceId: string): string {
  return `${seanceId}:${ressourceId}`
}

export async function fetchEtatsRessourcesSeances(): Promise<EtatRessourceSeance[]> {
  const { data, error } = await supabase.from('seance_ressources_etat').select('*')
  if (error) throw error
  return data
}

export async function setEtatRessourceSeance(
  seanceId: string,
  ressourceId: string,
  changes: Partial<Pick<EtatRessourceSeance, 'imprime' | 'distribue'>>,
): Promise<EtatRessourceSeance> {
  const { data, error } = await supabase
    .from('seance_ressources_etat')
    .upsert(
      { seance_id: seanceId, ressource_id: ressourceId, ...changes },
      { onConflict: 'seance_id,ressource_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}
