import { useCallback, useEffect, useState } from 'react'
import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import { fetchSeancesSemaine } from '../lib/seances'
import { fetchEvaluationsSemaine } from '../lib/evaluations'
import { messageErreur } from '../lib/erreurs'

/**
 * Charge toutes les séances et évaluations de l'année scolaire en une seule
 * fois (les fonctions `fetchSeancesSemaine`/`fetchEvaluationsSemaine`
 * acceptent n'importe quelle plage de dates, pas seulement une semaine).
 * Réutilisé par Export (aplatissement en lignes) et Devoirs (liste + calcul
 * des créneaux candidats), qui filtrent et regroupent ensuite côté client.
 */
export function useSeancesEvaluationsAnnee(anneeScolaireId: string | null, dateDebutAnnee: string, dateFinAnnee: string) {
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
        fetchSeancesSemaine(anneeScolaireId, dateDebutAnnee, dateFinAnnee),
        fetchEvaluationsSemaine(anneeScolaireId, dateDebutAnnee, dateFinAnnee),
      ])
      setSeances(s)
      setEvaluations(e)
      setError(null)
    } catch (err) {
      setError(messageErreur(err))
    } finally {
      setLoading(false)
    }
  }, [anneeScolaireId, dateDebutAnnee, dateFinAnnee])

  useEffect(() => {
    reload()
  }, [reload])

  return { seances, evaluations, loading, error, reload }
}
