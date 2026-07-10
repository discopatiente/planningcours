import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useUnites } from '../hooks/useUnites'
import { useRessourcesToutes } from '../hooks/useRessourcesToutes'
import { useSemaine } from '../hooks/useSemaine'
import { useImpressions } from '../hooks/useImpressions'
import { TYPES_RESSOURCES_IMPRIMABLES } from '../lib/impressions'
import type { TypeRessource } from '../types/ressource'

const LIBELLES_TYPE_RESSOURCE: Record<TypeRessource, string> = {
  support: 'Support de cours',
  video: 'Vidéo',
  exercice: 'Exercice',
  devoir_possible: 'Devoir possible',
  lien_utile: 'Lien utile',
}

function formatDateCourte(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

interface LigneImpression {
  seanceId: string
  ressourceId: string
  date: string
  titreUnite: string
  classeNom: string
  matiereNom: string
  matiereCouleur: string
  ressourceType: TypeRessource
  ressourceLibelle: string | null
  ressourceUrl: string
}

function Impressions() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { ressources } = useRessourcesToutes()
  const { seances, loading: loadingSeances } = useSemaine(
    anneeActive?.id ?? null,
    anneeActive?.date_debut ?? '',
    anneeActive?.date_fin ?? '',
  )
  const { getEtat, setEtat, loading: loadingEtats } = useImpressions()

  const [afficherHistorique, setAfficherHistorique] = useState(false)

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])

  const ressourcesImprimablesParUnite = useMemo(() => {
    const map = new Map<string, typeof ressources>()
    for (const r of ressources) {
      if (!TYPES_RESSOURCES_IMPRIMABLES.includes(r.type)) continue
      const liste = map.get(r.unite_id) ?? []
      liste.push(r)
      map.set(r.unite_id, liste)
    }
    return map
  }, [ressources])

  const lignes = useMemo(() => {
    const resultat: LigneImpression[] = []
    for (const s of seances) {
      if (s.statut === 'annulee' || !s.unite_id) continue
      const unite = unitesParId.get(s.unite_id)
      const progression = progressionsParId.get(s.planning.progression_id)
      const matiere = progression ? matieresParId.get(progression.matiere_id) : undefined
      const classe = classesParId.get(s.planning.classe_id)
      const ressourcesUnite = ressourcesImprimablesParUnite.get(s.unite_id) ?? []
      for (const r of ressourcesUnite) {
        resultat.push({
          seanceId: s.id,
          ressourceId: r.id,
          date: s.date,
          titreUnite: s.override_titre ?? unite?.titre ?? '(unité supprimée)',
          classeNom: classe?.nom ?? '?',
          matiereNom: matiere?.nom ?? '?',
          matiereCouleur: matiere?.couleur ?? '#999',
          ressourceType: r.type,
          ressourceLibelle: r.libelle,
          ressourceUrl: r.url,
        })
      }
    }
    resultat.sort((a, b) => a.date.localeCompare(b.date))
    return resultat
  }, [seances, unitesParId, progressionsParId, matieresParId, classesParId, ressourcesImprimablesParUnite])

  const lignesAffichees = useMemo(() => {
    if (afficherHistorique) return lignes
    return lignes.filter((l) => !getEtat(l.seanceId, l.ressourceId).distribue)
  }, [lignes, afficherHistorique, getEtat])

  const loading = loadingSeances || loadingEtats

  return (
    <div>
      <h2 className="section-title">Impressions</h2>
      <p className="section-desc">
        Ressources à imprimer et à distribuer, classées par date d'utilisation prévue. Cocher « Imprimé »
        retire le rappel d'impression de la vue Semaine et fait apparaître un rappel de distribution ;
        cocher « Distribué » retire ce dernier.
      </p>

      <label className="modal-field-inline" style={{ marginBottom: 12, display: 'inline-flex' }}>
        <input
          type="checkbox"
          checked={afficherHistorique}
          onChange={(e) => setAfficherHistorique(e.target.checked)}
        />
        Afficher aussi les ressources déjà distribuées
      </label>

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : loading ? null : lignesAffichees.length === 0 ? (
        <p className="section-desc">Rien à imprimer pour le moment.</p>
      ) : (
        <div className="card">
          {lignesAffichees.map((l) => {
            const etat = getEtat(l.seanceId, l.ressourceId)
            return (
              <div className="card-row" key={`${l.seanceId}-${l.ressourceId}`}>
                <span className="alertes-item-date">{formatDateCourte(l.date)}</span>
                <span className="referentiel-group-dot" style={{ background: l.matiereCouleur }} />
                <span className="card-row-label">
                  <a href={l.ressourceUrl} target="_blank" rel="noreferrer">
                    {l.ressourceLibelle || LIBELLES_TYPE_RESSOURCE[l.ressourceType]}
                  </a>{' '}
                  — {l.titreUnite} ({LIBELLES_TYPE_RESSOURCE[l.ressourceType]}) — {l.classeNom} — {l.matiereNom}
                </span>
                <label className="modal-field-inline">
                  <input
                    type="checkbox"
                    checked={etat.imprime}
                    onChange={(e) => setEtat(l.seanceId, l.ressourceId, { imprime: e.target.checked })}
                  />
                  Imprimé
                </label>
                <label className="modal-field-inline">
                  <input
                    type="checkbox"
                    checked={etat.distribue}
                    onChange={(e) => setEtat(l.seanceId, l.ressourceId, { distribue: e.target.checked })}
                  />
                  Distribué
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Impressions
