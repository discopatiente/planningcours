import { useCallback, useEffect, useState } from 'react'
import type { Eleve } from '../types/eleve'
import { createEleve, deleteEleve, fetchEleves, updateEleve } from '../lib/eleves'

export function useEleves(classeId: string | null) {
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!classeId) {
      setEleves([])
      setLoading(false)
      return
    }
    setLoading(true)
    setEleves(await fetchEleves(classeId))
    setLoading(false)
  }, [classeId])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (nom: string, prenom: string) => {
      if (!classeId) return
      const created = await createEleve(classeId, nom, prenom)
      setEleves((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
    },
    [classeId],
  )

  const edit = useCallback(async (id: string, changes: Partial<Pick<Eleve, 'nom' | 'prenom'>>) => {
    const updated = await updateEleve(id, changes)
    setEleves((prev) => prev.map((e) => (e.id === id ? updated : e)))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteEleve(id)
    setEleves((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { eleves, loading, add, edit, remove }
}
