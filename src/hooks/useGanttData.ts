import { useEffect, useState } from 'react'
import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import { fetchSeancesSemaine } from '../lib/seances'
import { fetchEvaluationsSemaine } from '../lib/evaluations'

/**
 * Charge toutes les séances et évaluations de l'année scolaire en une seule
 * fois (les fonctions `fetchSeancesSemaine`/`fetchEvaluationsSemaine`
 * acceptent n'importe quelle plage de dates, pas seulement une semaine). La
 * vue Gantt filtre et regroupe ensuite ces données côté client selon le zoom
 * et le mode choisis, sans refetch à chaque changement de zoom.
 */
export function useGanttData(anneeScolaireId: string | null, dateDebutAnnee: string, dateFinAnnee: string) {
  const [seances, setSeances] = useState<SeanceAvecPlanning[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationAvecPlanning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!anneeScolaireId) {
      setSeances([])
      setEvaluations([])
      setLoading(false)
      return
    }
    let annule = false
    setLoading(true)
    Promise.all([
      fetchSeancesSemaine(anneeScolaireId, dateDebutAnnee, dateFinAnnee),
      fetchEvaluationsSemaine(anneeScolaireId, dateDebutAnnee, dateFinAnnee),
    ])
      .then(([s, e]) => {
        if (annule) return
        setSeances(s)
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
  }, [anneeScolaireId, dateDebutAnnee, dateFinAnnee])

  return { seances, evaluations, loading, error }
}
