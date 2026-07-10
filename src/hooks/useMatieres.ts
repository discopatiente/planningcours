import { useCallback, useEffect, useState } from 'react'
import type { Matiere } from '../types/matiere'
import { createMatiere, deleteMatiere, fetchMatieres, updateMatiere } from '../lib/matieres'

export function useMatieres() {
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setMatieres(await fetchMatieres())
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

  const add = useCallback(async (nom: string, couleur: string) => {
    const created = await createMatiere(nom, couleur)
    setMatieres((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
  }, [])

  const edit = useCallback(
    async (id: string, changes: Partial<Pick<Matiere, 'nom' | 'couleur' | 'max_evaluations_exclu'>>) => {
      const updated = await updateMatiere(id, changes)
      setMatieres((prev) => prev.map((m) => (m.id === id ? updated : m)))
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    await deleteMatiere(id)
    setMatieres((prev) => prev.filter((m) => m.id !== id))
  }, [])

  return { matieres, loading, error, add, edit, remove }
}
