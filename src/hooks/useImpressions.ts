import { useCallback, useEffect, useState } from 'react'
import type { EtatRessourceSeance } from '../types/impression'
import { cleEtatRessourceSeance, fetchEtatsRessourcesSeances, setEtatRessourceSeance } from '../lib/impressions'

export function useImpressions() {
  const [etats, setEtats] = useState<Map<string, EtatRessourceSeance>>(new Map())
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const data = await fetchEtatsRessourcesSeances()
    setEtats(new Map(data.map((e) => [cleEtatRessourceSeance(e.seance_id, e.ressource_id), e])))
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  function getEtat(seanceId: string, ressourceId: string): { imprime: boolean; distribue: boolean } {
    const existant = etats.get(cleEtatRessourceSeance(seanceId, ressourceId))
    return { imprime: existant?.imprime ?? false, distribue: existant?.distribue ?? false }
  }

  const setEtat = useCallback(
    async (seanceId: string, ressourceId: string, changes: Partial<Pick<EtatRessourceSeance, 'imprime' | 'distribue'>>) => {
      const k = cleEtatRessourceSeance(seanceId, ressourceId)
      setEtats((prev) => {
        const next = new Map(prev)
        const existant = next.get(k)
        next.set(k, {
          id: existant?.id ?? k,
          seance_id: seanceId,
          ressource_id: ressourceId,
          imprime: existant?.imprime ?? false,
          distribue: existant?.distribue ?? false,
          ...changes,
        })
        return next
      })
      const sauvegarde = await setEtatRessourceSeance(seanceId, ressourceId, changes)
      setEtats((prev) => new Map(prev).set(k, sauvegarde))
    },
    [],
  )

  return { etats, getEtat, setEtat, loading, reload }
}
