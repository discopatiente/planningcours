import { useCallback, useEffect, useState } from 'react'
import type { Progression } from '../types/progression'
import {
  createProgression,
  deleteProgression,
  fetchProgressions,
  updateProgression,
} from '../lib/progressions'

export function useProgressions() {
  const [progressions, setProgressions] = useState<Progression[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setProgressions(await fetchProgressions())
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
    const created = await createProgression(nom, matiereId)
    setProgressions((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
    return created
  }, [])

  const edit = useCallback(
    async (id: string, changes: Partial<Pick<Progression, 'nom' | 'matiere_id'>>) => {
      const updated = await updateProgression(id, changes)
      setProgressions((prev) =>
        prev.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.nom.localeCompare(b.nom)),
      )
      return updated
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    await deleteProgression(id)
    setProgressions((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { progressions, loading, error, add, edit, remove }
}
