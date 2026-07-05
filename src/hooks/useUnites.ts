import { useCallback, useEffect, useState } from 'react'
import type { Unite } from '../types/unite'
import {
  createUnite,
  deleteUnite,
  dupliquerUnite,
  fetchUnites,
  updateUnite,
} from '../lib/unites'

type ChampsModifiables = Parameters<typeof updateUnite>[1]

export function useUnites() {
  const [unites, setUnites] = useState<Unite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUnites(await fetchUnites())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(async (titre: string, matiereId: string) => {
    const created = await createUnite(titre, matiereId)
    setUnites((prev) => [...prev, created].sort((a, b) => a.titre.localeCompare(b.titre)))
    return created
  }, [])

  const edit = useCallback(async (id: string, changes: ChampsModifiables) => {
    const updated = await updateUnite(id, changes)
    setUnites((prev) =>
      prev.map((u) => (u.id === id ? updated : u)).sort((a, b) => a.titre.localeCompare(b.titre)),
    )
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteUnite(id)
    setUnites((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const dupliquer = useCallback(async (unite: Unite) => {
    const copie = await dupliquerUnite(unite)
    setUnites((prev) => [...prev, copie].sort((a, b) => a.titre.localeCompare(b.titre)))
    return copie
  }, [])

  return { unites, loading, error, add, edit, remove, dupliquer }
}
