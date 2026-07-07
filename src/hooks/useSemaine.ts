import { useCallback, useEffect, useState } from 'react'
import type { SeanceAvecPlanning, StatutSeance } from '../types/seance'
import type { EvaluationAvecPlanning, StatutEvaluation } from '../types/evaluation'
import { fetchSeancesSemaine, updateStatutSeance } from '../lib/seances'
import { fetchEvaluationsSemaine, updateStatutEvaluation } from '../lib/evaluations'

export function useSemaine(anneeScolaireId: string | null, dateDebut: string, dateFin: string) {
  const [seances, setSeances] = useState<SeanceAvecPlanning[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationAvecPlanning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!anneeScolaireId) {
      setSeances([])
      setEvaluations([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [s, e] = await Promise.all([
        fetchSeancesSemaine(anneeScolaireId, dateDebut, dateFin),
        fetchEvaluationsSemaine(anneeScolaireId, dateDebut, dateFin),
      ])
      setSeances(s)
      setEvaluations(e)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [anneeScolaireId, dateDebut, dateFin])

  useEffect(() => {
    reload()
  }, [reload])

  const marquerSeanceFaite = useCallback(
    async (id: string, fait: boolean) => {
      const statut: StatutSeance = fait ? 'fait' : 'a_venir'
      setSeances((prev) => prev.map((s) => (s.id === id ? { ...s, statut } : s)))
      try {
        await updateStatutSeance(id, statut)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        await reload()
      }
    },
    [reload],
  )

  const marquerEvaluationFaite = useCallback(
    async (id: string, fait: boolean) => {
      const statut: StatutEvaluation = fait ? 'fait' : 'a_venir'
      setEvaluations((prev) => prev.map((e) => (e.id === id ? { ...e, statut } : e)))
      try {
        await updateStatutEvaluation(id, statut)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        await reload()
      }
    },
    [reload],
  )

  return { seances, evaluations, loading, error, marquerSeanceFaite, marquerEvaluationFaite }
}
