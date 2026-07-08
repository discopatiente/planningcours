import { useCallback, useEffect, useState } from 'react'
import type { InstanceUnite } from '../lib/seances'
import { fetchInstancesUnite, pousserTemplateVersInstances } from '../lib/seances'

export function useInstancesUnite(uniteId: string | null, anneeScolaireId: string | null) {
  const [instances, setInstances] = useState<InstanceUnite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!uniteId || !anneeScolaireId) {
      setInstances([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setInstances(await fetchInstancesUnite(uniteId, anneeScolaireId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [uniteId, anneeScolaireId])

  useEffect(() => {
    reload()
  }, [reload])

  const pousser = useCallback(
    async (classeIds: string[]) => {
      if (!uniteId || !anneeScolaireId) return 0
      const nb = await pousserTemplateVersInstances(uniteId, classeIds, anneeScolaireId)
      await reload()
      return nb
    },
    [uniteId, anneeScolaireId, reload],
  )

  return { instances, loading, error, pousser }
}
