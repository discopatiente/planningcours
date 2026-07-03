import { useCallback, useEffect, useState } from 'react'
import type { Classe } from '../types/classe'
import { createClasse, fetchClasses } from '../lib/classes'

export function useClasses() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    setClasses(await fetchClasses())
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(async (nom: string, niveau: string) => {
    const created = await createClasse(nom, niveau)
    setClasses((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
    return created
  }, [])

  return { classes, loading, add }
}
