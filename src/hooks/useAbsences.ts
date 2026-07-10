import { useCallback, useEffect, useState } from 'react'
import type { AbsenceEvaluation } from '../types/absence'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import {
  attacherRattrapage,
  detacherRattrapage,
  deleteAbsences,
  fetchAbsences,
  insertAbsences,
} from '../lib/absences'
import { fetchEvaluationsAnneeAvecPlanning } from '../lib/evaluations'

export function useAbsences(anneeScolaireId: string | null) {
  const [absences, setAbsences] = useState<AbsenceEvaluation[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationAvecPlanning[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!anneeScolaireId) {
      setAbsences([])
      setEvaluations([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [a, e] = await Promise.all([fetchAbsences(), fetchEvaluationsAnneeAvecPlanning(anneeScolaireId)])
    setAbsences(a)
    setEvaluations(e)
    setLoading(false)
  }, [anneeScolaireId])

  useEffect(() => {
    reload()
  }, [reload])

  // Fait correspondre l'ensemble des élèves cochés absents pour cette
  // évaluation à l'état enregistré : ajoute les nouvelles absences, retire
  // celles redevenues présentes — sans jamais toucher une absence déjà
  // attachée à un créneau de rattrapage (verrouillée côté UI).
  const definirPresences = useCallback(
    async (evaluationId: string, eleveIdsAbsents: string[]) => {
      const modifiables = absences.filter((a) => a.evaluation_id === evaluationId && a.rattrapage_seance_id === null)
      const idsActuels = new Set(modifiables.map((a) => a.eleve_id))
      const aAjouter = eleveIdsAbsents.filter((id) => !idsActuels.has(id))
      const aRetirer = modifiables.filter((a) => !eleveIdsAbsents.includes(a.eleve_id)).map((a) => a.id)
      await Promise.all([insertAbsences(evaluationId, aAjouter), deleteAbsences(aRetirer)])
      await reload()
    },
    [absences, reload],
  )

  // Fait correspondre l'ensemble des absences cochées pour ce créneau de
  // rattrapage à l'état enregistré : attache les nouvelles, détache celles
  // décochées (elles redeviennent en attente).
  const definirRattrapages = useCallback(
    async (seanceId: string, absenceIdsSouhaites: string[]) => {
      const attachees = absences.filter((a) => a.rattrapage_seance_id === seanceId)
      const idsActuels = new Set(attachees.map((a) => a.id))
      const aAttacher = absenceIdsSouhaites.filter((id) => !idsActuels.has(id))
      const aDetacher = attachees.filter((a) => !absenceIdsSouhaites.includes(a.id)).map((a) => a.id)
      await Promise.all([attacherRattrapage(aAttacher, seanceId), detacherRattrapage(aDetacher)])
      await reload()
    },
    [absences, reload],
  )

  return { absences, evaluations, loading, reload, definirPresences, definirRattrapages }
}
