import { useCallback, useEffect, useState } from 'react'
import type { Unite } from '../types/unite'
import {
  assignUniteToChapitre,
  createUnite,
  deleteUnite,
  dupliquerUnite,
  fetchUnites,
  reorderUnitesDansChapitre,
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

  const assignerChapitre = useCallback(async (id: string, chapitreId: string | null) => {
    const updated = await assignUniteToChapitre(id, chapitreId)
    setUnites((prev) => prev.map((u) => (u.id === id ? updated : u)))
    return updated
  }, [])

  const reorderDansChapitre = useCallback(
    (chapitreId: string, orderedIds: string[]) => {
      setUnites((prev) => {
        const rang = new Map(orderedIds.map((id, index) => [id, index + 1]))
        return prev.map((u) =>
          u.chapitre_id === chapitreId && rang.has(u.id)
            ? { ...u, ordre_interne_par_defaut: rang.get(u.id)! }
            : u,
        )
      })
      reorderUnitesDansChapitre(orderedIds).catch(() => reload())
    },
    [reload],
  )

  return {
    unites,
    loading,
    error,
    reload,
    add,
    edit,
    remove,
    dupliquer,
    assignerChapitre,
    reorderDansChapitre,
  }
}
