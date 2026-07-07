import { useCallback, useEffect, useState } from 'react'
import type { Ressource } from '../types/ressource'
import { fetchToutesRessources } from '../lib/ressources'

export function useRessourcesToutes() {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    setRessources(await fetchToutesRessources())
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { ressources, loading }
}
