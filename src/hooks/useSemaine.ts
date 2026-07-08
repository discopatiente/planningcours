import { useCallback, useEffect, useState } from 'react'
import type { SeanceAvecPlanning, StatutSeance } from '../types/seance'
import type { EvaluationAvecPlanning, StatutEvaluation } from '../types/evaluation'
import { fetchSeancesSemaine, updateStatutSeance } from '../lib/seances'
import { fetchEvaluationsSemaine, updateStatutEvaluation } from '../lib/evaluations'
import { MARGE_ALERTES_JOURS } from '../lib/alertes'
import { ajouterJours, parseISODate, toISODate } from '../lib/dates'

export function useSemaine(anneeScolaireId: string | null, dateDebut: string, dateFin: string) {
  const [seances, setSeances] = useState<SeanceAvecPlanning[]>([])
  const [seancesFenetreAlertes, setSeancesFenetreAlertes] = useState<SeanceAvecPlanning[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationAvecPlanning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!anneeScolaireId) {
      setSeances([])
      setSeancesFenetreAlertes([])
      setEvaluations([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const finFenetreAlertes = toISODate(ajouterJours(parseISODate(dateFin), MARGE_ALERTES_JOURS))
      const [s, alertes, e] = await Promise.all([
        fetchSeancesSemaine(anneeScolaireId, dateDebut, dateFin),
        fetchSeancesSemaine(anneeScolaireId, dateDebut, finFenetreAlertes),
        fetchEvaluationsSemaine(anneeScolaireId, dateDebut, dateFin),
      ])
      setSeances(s)
      setSeancesFenetreAlertes(alertes)
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
      setSeancesFenetreAlertes((prev) => prev.map((s) => (s.id === id ? { ...s, statut } : s)))
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

  const annulerEvaluation = useCallback(
    async (id: string) => {
      try {
        await updateStatutEvaluation(id, 'annulee')
      } finally {
        await reload()
      }
    },
    [reload],
  )

  return {
    seances,
    seancesFenetreAlertes,
    evaluations,
    loading,
    error,
    reload,
    marquerSeanceFaite,
    marquerEvaluationFaite,
    annulerEvaluation,
  }
}
