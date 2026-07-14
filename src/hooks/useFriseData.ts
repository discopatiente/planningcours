import { useEffect, useState } from 'react'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import { fetchEvaluationsAnneeAvecPlanning } from '../lib/evaluations'

/** Toutes les évaluations de l'année (toutes classes confondues), pour la vue Frise. */
export function useFriseData(anneeScolaireId: string | null) {
  const [evaluations, setEvaluations] = useState<EvaluationAvecPlanning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!anneeScolaireId) {
      setEvaluations([])
      setLoading(false)
      return
    }
    let annule = false
    setLoading(true)
    fetchEvaluationsAnneeAvecPlanning(anneeScolaireId)
      .then((e) => {
        if (annule) return
        setEvaluations(e)
        setError(null)
      })
      .catch((err) => {
        if (annule) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!annule) setLoading(false)
      })
    return () => {
      annule = true
    }
  }, [anneeScolaireId])

  return { evaluations, loading, error }
}
