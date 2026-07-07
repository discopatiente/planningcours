import { useCallback, useEffect, useState } from 'react'
import type { Parametres } from '../types/parametres'
import { fetchParametres, updateAcademie, updateReglesEvaluations } from '../lib/parametres'

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

  const definirReglesEvaluations = useCallback(
    async (changes: Partial<Pick<Parametres, 'evaluations_par_trimestre' | 'max_evaluations_semaine'>>) => {
      setParametres(await updateReglesEvaluations(changes))
    },
    [],
  )

  return { parametres, loading, error, definirAcademie, definirReglesEvaluations }
}
