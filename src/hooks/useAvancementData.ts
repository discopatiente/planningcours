import { useEffect, useState } from 'react'
import type { Planning } from '../types/planning'
import type { ProgressionUnite } from '../types/progressionUnite'
import type { Seance } from '../types/seance'
import { fetchProgressionUnites } from '../lib/progressionUnites'
import { fetchSeancesPlanning } from '../lib/seances'

export interface DonneesAvancementPlanning {
  progressionUnites: ProgressionUnite[]
  seances: Seance[]
}

/** Charge, pour chaque planning, sa progression ordonnée (avec chapitres) et ses séances — nécessaires au calcul d'avancement (cf. `lib/avancement.ts`). */
export function useAvancementData(plannings: Planning[]) {
  const [donnees, setDonnees] = useState<Map<string, DonneesAvancementPlanning>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const planningIdsKey = plannings
    .map((p) => p.id)
    .sort()
    .join(',')

  useEffect(() => {
    if (plannings.length === 0) {
      setDonnees(new Map())
      setLoading(false)
      return
    }
    let annule = false
    setLoading(true)
    Promise.all(
      plannings.map((p) =>
        Promise.all([fetchProgressionUnites(p.progression_id), fetchSeancesPlanning(p.id)]).then(
          ([progressionUnites, seances]) => [p.id, { progressionUnites, seances }] as const,
        ),
      ),
    )
      .then((entrees) => {
        if (annule) return
        setDonnees(new Map(entrees))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planningIdsKey])

  return { donnees, loading, error }
}
