import { useCallback, useEffect, useState } from 'react'
import type { Parametres } from '../types/parametres'
import { fetchParametres, updateAcademie } from '../lib/parametres'

export function useParametres() {
  const [parametres, setParametres] = useState<Parametres | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchParametres()
      .then(setParametres)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  const definirAcademie = useCallback(async (academie: string) => {
    setParametres(await updateAcademie(academie || null))
  }, [])

  return { parametres, loading, error, definirAcademie }
}
