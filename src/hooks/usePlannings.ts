import { useCallback, useEffect, useState } from 'react'
import type { Planning } from '../types/planning'
import type { AnneeScolaire } from '../types/anneeScolaire'
import type { Progression } from '../types/progression'
import {
  deletePlanning,
  fetchPlanningsAnnee,
  genererPlanning,
  type ResultatGeneration,
} from '../lib/plannings'

export function usePlannings(anneeScolaireId: string | null) {
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!anneeScolaireId) {
      setPlannings([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setPlannings(await fetchPlanningsAnnee(anneeScolaireId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [anneeScolaireId])

  useEffect(() => {
    reload()
  }, [reload])

  const generer = useCallback(
    async (classeId: string, progression: Progression, anneeScolaire: AnneeScolaire): Promise<ResultatGeneration> => {
      const planningExistant =
        plannings.find((p) => p.classe_id === classeId && p.progression_id === progression.id) ?? null
      const resultat = await genererPlanning(classeId, progression, anneeScolaire, planningExistant)
      await reload()
      return resultat
    },
    [plannings, reload],
  )

  const decharger = useCallback(
    async (id: string): Promise<void> => {
      await deletePlanning(id)
      await reload()
    },
    [reload],
  )

  return { plannings, loading, error, generer, decharger }
}
