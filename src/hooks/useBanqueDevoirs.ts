import { useCallback, useEffect, useState } from 'react'
import type { BanqueDevoir } from '../types/banqueDevoir'
import {
  createBanqueDevoir,
  deleteBanqueDevoir,
  fetchBanqueDevoirs,
  updateBanqueDevoir,
} from '../lib/banqueDevoirs'
import { messageErreur } from '../lib/erreurs'

type ChampsModifiables = Parameters<typeof updateBanqueDevoir>[1]

export function useBanqueDevoirs() {
  const [devoirs, setDevoirs] = useState<BanqueDevoir[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setDevoirs(await fetchBanqueDevoirs())
      setError(null)
    } catch (err) {
      setError(messageErreur(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(async (titre: string, matiereId: string, niveau: BanqueDevoir['niveau']) => {
    const created = await createBanqueDevoir(titre, matiereId, niveau)
    setDevoirs((prev) => [...prev, created].sort((a, b) => a.titre.localeCompare(b.titre)))
    return created
  }, [])

  const edit = useCallback(async (id: string, changes: ChampsModifiables) => {
    const updated = await updateBanqueDevoir(id, changes)
    setDevoirs((prev) =>
      prev.map((d) => (d.id === id ? updated : d)).sort((a, b) => a.titre.localeCompare(b.titre)),
    )
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteBanqueDevoir(id)
    setDevoirs((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { devoirs, loading, error, reload, add, edit, remove }
}
