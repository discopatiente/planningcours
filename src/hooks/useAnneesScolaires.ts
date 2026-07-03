import { useCallback, useEffect, useState } from 'react'
import type { AnneeScolaire } from '../types/anneeScolaire'
import {
  createAnneeScolaire,
  fetchAnneesScolaires,
  setAnneeActive,
  updateReferenceSemaineA,
} from '../lib/anneesScolaires'

export function useAnneesScolaires() {
  const [annees, setAnnees] = useState<AnneeScolaire[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    setAnnees(await fetchAnneesScolaires())
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (libelle: string, dateDebut: string, dateFin: string) => {
      const created = await createAnneeScolaire(libelle, dateDebut, dateFin)
      await setAnneeActive(created.id)
      await reload()
      return created
    },
    [reload],
  )

  const activer = useCallback(
    async (id: string) => {
      await setAnneeActive(id)
      await reload()
    },
    [reload],
  )

  const definirReferenceSemaineA = useCallback(
    async (id: string, referenceSemaineADate: string | null) => {
      await updateReferenceSemaineA(id, referenceSemaineADate)
      await reload()
    },
    [reload],
  )

  return { annees, loading, add, activer, definirReferenceSemaineA }
}
