import { useCallback, useEffect, useState } from 'react'
import type { Chapitre } from '../types/chapitre'
import { createChapitre, deleteChapitre, fetchChapitres, updateChapitre } from '../lib/chapitres'

type ChampsModifiables = Parameters<typeof updateChapitre>[1]

export function useChapitres() {
  const [chapitres, setChapitres] = useState<Chapitre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setChapitres(await fetchChapitres())
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

  const add = useCallback(async (nom: string, matiereId: string) => {
    const created = await createChapitre(nom, matiereId)
    setChapitres((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
    return created
  }, [])

  const edit = useCallback(async (id: string, changes: ChampsModifiables) => {
    const updated = await updateChapitre(id, changes)
    setChapitres((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.nom.localeCompare(b.nom)),
    )
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteChapitre(id)
    setChapitres((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { chapitres, loading, error, reload, add, edit, remove }
}
