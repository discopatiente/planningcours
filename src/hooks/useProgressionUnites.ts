import { useCallback, useEffect, useState } from 'react'
import type { ProgressionUnite } from '../types/progressionUnite'
import {
  addChapitreToProgression,
  addUniteToProgression,
  fetchProgressionUnites,
  removeProgressionUnite,
  reorderProgressionUnites,
} from '../lib/progressionUnites'

export function useProgressionUnites(progressionId: string | null) {
  const [items, setItems] = useState<ProgressionUnite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!progressionId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setItems(await fetchProgressionUnites(progressionId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [progressionId])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (uniteId: string) => {
      if (!progressionId) return
      const created = await addUniteToProgression(progressionId, uniteId)
      setItems((prev) => [...prev, created])
    },
    [progressionId],
  )

  const addChapitre = useCallback(
    async (uniteIds: string[]) => {
      if (!progressionId || uniteIds.length === 0) return
      const created = await addChapitreToProgression(progressionId, uniteIds)
      setItems((prev) => [...prev, ...created])
    },
    [progressionId],
  )

  const remove = useCallback(
    async (id: string) => {
      await removeProgressionUnite(id)
      const restants = items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, position: index + 1 }))
      setItems(restants)
      reorderProgressionUnites(restants.map((item) => item.id)).catch(() => reload())
    },
    [items, reload],
  )

  const reorder = useCallback(
    (nouvelOrdre: ProgressionUnite[]) => {
      setItems(nouvelOrdre.map((item, index) => ({ ...item, position: index + 1 })))
      reorderProgressionUnites(nouvelOrdre.map((item) => item.id)).catch(() => reload())
    },
    [reload],
  )

  return { items, loading, error, add, addChapitre, remove, reorder }
}
