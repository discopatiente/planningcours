import { useCallback, useEffect, useState } from 'react'
import type { Eleve } from '../types/eleve'
import { fetchTousEleves } from '../lib/eleves'

export function useTousEleves() {
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    setEleves(await fetchTousEleves())
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { eleves, loading, reload }
}
