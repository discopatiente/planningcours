import { useCallback, useEffect, useState } from 'react'
import type { Ressource, TypeRessource } from '../types/ressource'
import {
  createRessource,
  deleteRessource,
  fetchRessources,
  reorderRessources,
  updateRessource,
} from '../lib/ressources'

export function useRessources(uniteId: string | null) {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!uniteId) {
      setRessources([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setRessources(await fetchRessources(uniteId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [uniteId])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (type: TypeRessource, url: string, libelle: string | null) => {
      if (!uniteId) return
      const created = await createRessource(uniteId, type, url, libelle)
      setRessources((prev) => [...prev, created])
      return created
    },
    [uniteId],
  )

  const edit = useCallback(
    async (id: string, changes: Parameters<typeof updateRessource>[1]) => {
      const updated = await updateRessource(id, changes)
      setRessources((prev) => prev.map((r) => (r.id === id ? updated : r)))
      return updated
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    await deleteRessource(id)
    setRessources((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const reorder = useCallback(
    (nouvelOrdre: Ressource[]) => {
      setRessources(nouvelOrdre.map((r, index) => ({ ...r, ordre: index + 1 })))
      reorderRessources(nouvelOrdre.map((r) => r.id)).catch(() => reload())
    },
    [reload],
  )

  return { ressources, loading, error, add, edit, remove, reorder }
}
