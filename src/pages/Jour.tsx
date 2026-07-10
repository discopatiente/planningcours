import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useUnites } from '../hooks/useUnites'
import { useRessourcesToutes } from '../hooks/useRessourcesToutes'
import { useSemaine } from '../hooks/useSemaine'
import { useImpressions } from '../hooks/useImpressions'
import { ajouterJours, parseISODate, toISODate } from '../lib/dates'
import { calculerAlertesDistribution, calculerAlertesImpression, calculerAlertesInstructionsEleves } from '../lib/alertes'
import { construireRessourcesImprimablesParUnite } from '../lib/impressions'
import { LIBELLES_TYPE_RESSOURCE } from '../lib/ressources'
import { construireRessourcePrincipaleParUnite, detailsItem, formatHeure } from '../lib/semaineItems'
import type { ItemJour } from '../lib/semaineItems'
import { signOut } from '../lib/auth'
import type { SeanceAvecPlanning } from '../types/seance'

function formatDateGrand(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function Jour() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { ressources } = useRessourcesToutes()
  const { etats: etatsImpressions, getEtat, setEtat } = useImpressions()

  const [jour, setJour] = useState(() => toISODate(new Date()))
  const aujourdhui = toISODate(new Date())

  const { seances, seancesFenetreAlertes, evaluations, loading, marquerSeanceFaite, marquerEvaluationFaite } =
    useSemaine(anneeActive?.id ?? null, jour, jour)

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])
  const ressourcePrincipaleParUnite = useMemo(() => construireRessourcePrincipaleParUnite(ressources), [ressources])
  const ressourcesImprimablesParUnite = useMemo(() => construireRessourcesImprimablesParUnite(ressources), [ressources])

  const ctxItems = useMemo(
    () => ({ classesParId, progressionsParId, matieresParId, unitesParId, ressourcePrincipaleParUnite }),
    [classesParId, progressionsParId, matieresParId, unitesParId, ressourcePrincipaleParUnite],
  )

  // Bornes = le jour affiché des deux côtés : les fonctions d'alerte
  // filtrent par échéance dans [lundi, vendredi], donc passer le même jour
  // deux fois les restreint naturellement à aujourd'hui.
  const alertesImpression = useMemo(
    () => calculerAlertesImpression(seancesFenetreAlertes, unitesParId, jour, jour, ressourcesImprimablesParUnite, etatsImpressions),
    [seancesFenetreAlertes, unitesParId, jour, ressourcesImprimablesParUnite, etatsImpressions],
  )
  const alertesDistribution = useMemo(
    () => calculerAlertesDistribution(seances, unitesParId, ressourcesImprimablesParUnite, etatsImpressions, jour, jour),
    [seances, unitesParId, ressourcesImprimablesParUnite, etatsImpressions, jour],
  )
  const alertesInstructions = useMemo(
    () => calculerAlertesInstructionsEleves(seancesFenetreAlertes, unitesParId, jour, jour),
    [seancesFenetreAlertes, unitesParId, jour],
  )

  const idsImpression = useMemo(() => new Set(alertesImpression.map((a) => a.seance.id)), [alertesImpression])
  const idsDistribution = useMemo(() => new Set(alertesDistribution.map((a) => a.seance.id)), [alertesDistribution])
  const instructionParSeance = useMemo(
    () => new Map(alertesInstructions.map((a) => [a.seance.id, a.instruction])),
    [alertesInstructions],
  )

  const items = useMemo<ItemJour[]>(() => {
    const liste: ItemJour[] = [
      ...seances.map((s) => ({ kind: 'seance' as const, heure: s.heure_debut, data: s })),
      ...evaluations.map((e) => ({ kind: 'evaluation' as const, heure: e.heure_debut, data: e })),
    ]
    liste.sort((a, b) => a.heure.localeCompare(b.heure))
    return liste
  }, [seances, evaluations])

  function toggleFait(item: ItemJour, fait: boolean) {
    if (item.kind === 'evaluation') marquerEvaluationFaite(item.data.id, fait)
    else marquerSeanceFaite(item.data.id, fait)
  }

  const nbImpression = alertesImpression.length
  const nbDistribution = alertesDistribution.length
  const nbInstructions = alertesInstructions.length

  return (
    <div>
      <div className="jour-header">
        <div>
          <h2 className="jour-date">{formatDateGrand(jour)}</h2>
        </div>
        <button type="button" className="btn-sm" onClick={() => signOut()}>
          Se déconnecter
        </button>
      </div>

      {(nbImpression > 0 || nbDistribution > 0 || nbInstructions > 0) && (
        <Link to="/impressions" className="jour-pastilles">
          {nbImpression > 0 && <span>🖨️ {nbImpression}</span>}
          {nbDistribution > 0 && <span>📦 {nbDistribution}</span>}
          {nbInstructions > 0 && <span>📣 {nbInstructions}</span>}
        </Link>
      )}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <div className="jour-liste">
            {items.length === 0 && <p className="semaine-jour-vide">Aucun cours ce jour-là</p>}

            {items.map((item) => {
              const { classe, matiere, estEvaluation, titre, ressource } = detailsItem(item, ctxItems)
              const fait = item.data.statut === 'fait'
              const seance = item.kind === 'seance' ? (item.data as SeanceAvecPlanning) : null
              const instruction = seance ? instructionParSeance.get(seance.id) : undefined
              const aAlerteImpression = seance ? idsImpression.has(seance.id) : false
              const aAlerteDistribution = seance ? idsDistribution.has(seance.id) : false
              const ressourcesAImprimer =
                seance && (aAlerteImpression || aAlerteDistribution) && seance.unite_id
                  ? ressourcesImprimablesParUnite.get(seance.unite_id) ?? []
                  : []

              return (
                <div key={item.data.id} className="jour-item-wrapper">
                  <div
                    className={`semaine-item${estEvaluation ? ' semaine-item-evaluation' : ''}${fait ? ' jour-item-fait' : ''}`}
                  >
                    <span className="semaine-item-heure">{formatHeure(item.heure)}</span>
                    <span className="referentiel-group-dot" style={{ background: matiere?.couleur ?? '#999' }} />
                    <span className="semaine-item-corps">
                      <span className="semaine-item-titre">{titre}</span>
                      <span className="semaine-item-classe">
                        {classe?.nom ?? '?'} — {matiere?.nom ?? '?'}
                      </span>
                    </span>
                    {item.data.statut !== 'annulee' && (
                      <input
                        type="checkbox"
                        checked={fait}
                        onChange={(e) => toggleFait(item, e.target.checked)}
                        title="Fait"
                      />
                    )}
                    {ressource && (
                      <a href={ressource.url} target="_blank" rel="noreferrer" title="Ouvrir la ressource">
                        ↗
                      </a>
                    )}
                  </div>

                  {instruction && <p className="jour-alerte-inline">📣 À transmettre : {instruction}</p>}

                  {ressourcesAImprimer.map((r) => {
                    const etat = getEtat(seance!.id, r.id)
                    return (
                      <div className="jour-impression-inline" key={r.id}>
                        <span>{r.libelle || LIBELLES_TYPE_RESSOURCE[r.type]}</span>
                        <label className="modal-field-inline">
                          <input
                            type="checkbox"
                            checked={etat.imprime}
                            onChange={(e) => setEtat(seance!.id, r.id, { imprime: e.target.checked })}
                          />
                          Imprimé
                        </label>
                        <label className="modal-field-inline">
                          <input
                            type="checkbox"
                            checked={etat.distribue}
                            onChange={(e) => setEtat(seance!.id, r.id, { distribue: e.target.checked })}
                          />
                          Distribué
                        </label>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      )}

      <div className="jour-nav">
        <button type="button" className="btn-sm" onClick={() => setJour(toISODate(ajouterJours(parseISODate(jour), -1)))}>
          ◂ Hier
        </button>
        <button type="button" className="btn-sm" onClick={() => setJour(aujourdhui)}>
          Aujourd'hui
        </button>
        <button type="button" className="btn-sm" onClick={() => setJour(toISODate(ajouterJours(parseISODate(jour), 1)))}>
          Demain ▸
        </button>
      </div>
    </div>
  )
}

export default Jour
