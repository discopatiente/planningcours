import { useCallback, useEffect, useState } from 'react'
import type { PeriodeCalendrier, TypePeriode } from '../types/periodeCalendrier'
import type { AnneeScolaire } from '../types/anneeScolaire'
import {
  createPeriodeCalendrier,
  createPeriodesCalendrier,
  deletePeriodeCalendrier,
  fetchPeriodesCalendrier,
  updatePeriodeCalendrier,
} from '../lib/periodesCalendrier'
import { importerPeriodesAcademie } from '../lib/calendrierScolaireApi'

function parDateDebut(a: PeriodeCalendrier, b: PeriodeCalendrier) {
  return a.date_debut.localeCompare(b.date_debut)
}

export function usePeriodesCalendrier(anneeScolaireId: string | null) {
  const [periodes, setPeriodes] = useState<PeriodeCalendrier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!anneeScolaireId) {
      setPeriodes([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setPeriodes(await fetchPeriodesCalendrier(anneeScolaireId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [anneeScolaireId])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (nom: string, dateDebut: string, dateFin: string, type: TypePeriode) => {
      if (!anneeScolaireId) return
      const created = await createPeriodeCalendrier(anneeScolaireId, nom, dateDebut, dateFin, type)
      setPeriodes((prev) => [...prev, created].sort(parDateDebut))
    },
    [anneeScolaireId],
  )

  const edit = useCallback(
    async (
      id: string,
      changes: Partial<Pick<PeriodeCalendrier, 'nom' | 'date_debut' | 'date_fin' | 'type'>>,
    ) => {
      const updated = await updatePeriodeCalendrier(id, changes)
      setPeriodes((prev) => prev.map((p) => (p.id === id ? updated : p)).sort(parDateDebut))
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    await deletePeriodeCalendrier(id)
    setPeriodes((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const importer = useCallback(
    async (academie: string, annee: AnneeScolaire) => {
      if (!anneeScolaireId) return 0
      const importees = await importerPeriodesAcademie(academie, annee.libelle)
      const existantes = new Set(periodes.map((p) => `${p.nom}|${p.date_debut}`))
      const aInserer = importees
        .filter((p) => p.date_fin >= annee.date_debut && p.date_debut <= annee.date_fin)
        .filter((p) => !existantes.has(`${p.nom}|${p.date_debut}`))
      const inserees = await createPeriodesCalendrier(anneeScolaireId, aInserer)
      setPeriodes((prev) => [...prev, ...inserees].sort(parDateDebut))
      return inserees.length
    },
    [anneeScolaireId, periodes],
  )

  return { periodes, loading, error, add, edit, remove, importer }
}
