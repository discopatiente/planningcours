import { useCallback, useEffect, useState } from 'react'
import type { Creneau, FrequenceCreneau } from '../types/creneau'
import {
  copierDepuisAnneePrecedente,
  creerCreneau,
  fetchCreneaux,
  modifierCreneau,
  supprimerCreneau,
} from '../lib/emploiDuTemps'

export function useEmploiDuTemps(anneeScolaireId: string | null) {
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!anneeScolaireId) {
      setCreneaux([])
      setLoading(false)
      return
    }
    setLoading(true)
    setCreneaux(await fetchCreneaux(anneeScolaireId))
    setLoading(false)
  }, [anneeScolaireId])

  useEffect(() => {
    reload()
  }, [reload])

  const assigner = useCallback(
    async (
      jourSemaine: number,
      heureDebut: string,
      classeId: string,
      matiereId: string,
      frequence: FrequenceCreneau,
    ) => {
      if (!anneeScolaireId) return
      const created = await creerCreneau({
        annee_scolaire_id: anneeScolaireId,
        jour_semaine: jourSemaine,
        heure_debut: heureDebut,
        classe_id: classeId,
        matiere_id: matiereId,
        frequence,
      })
      setCreneaux((prev) => [...prev, created])
    },
    [anneeScolaireId],
  )

  const modifier = useCallback(
    async (id: string, classeId: string, matiereId: string, frequence: FrequenceCreneau) => {
      const updated = await modifierCreneau(id, {
        classe_id: classeId,
        matiere_id: matiereId,
        frequence,
      })
      setCreneaux((prev) => prev.map((c) => (c.id === id ? updated : c)))
    },
    [],
  )

  const supprimer = useCallback(async (id: string) => {
    await supprimerCreneau(id)
    setCreneaux((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const copierDepuis = useCallback(
    async (anneeScolairePrecedenteId: string) => {
      if (!anneeScolaireId) return
      await copierDepuisAnneePrecedente(anneeScolairePrecedenteId, anneeScolaireId)
      await reload()
    },
    [anneeScolaireId, reload],
  )

  return { creneaux, loading, assigner, modifier, supprimer, copierDepuis }
}
