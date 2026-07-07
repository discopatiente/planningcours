import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useUnites } from '../hooks/useUnites'
import { useRessourcesToutes } from '../hooks/useRessourcesToutes'
import { useSemaine } from '../hooks/useSemaine'
import { calculerSemaine, lundiDeLaSemaine } from '../lib/semaineAB'
import { ajouterJours, parseISODate, toISODate } from '../lib/dates'
import type { Ressource } from '../types/ressource'
import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'

const NOMS_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

type ItemJour =
  | { kind: 'seance'; heure: string; data: SeanceAvecPlanning }
  | { kind: 'evaluation'; heure: string; data: EvaluationAvecPlanning }

function formatJour(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatPlageSemaine(lundi: string, vendredi: string) {
  const d1 = new Date(`${lundi}T00:00:00`)
  const d2 = new Date(`${vendredi}T00:00:00`)
  const debut = d1.toLocaleDateString('fr-FR', { day: 'numeric', month: d1.getMonth() === d2.getMonth() ? undefined : 'long' })
  const fin = d2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${debut} – ${fin}`
}

function formatHeure(heure: string) {
  return heure.slice(0, 5)
}

function Semaine() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { ressources } = useRessourcesToutes()

  const [dateReference, setDateReference] = useState(() => toISODate(new Date()))
  const lundi = toISODate(lundiDeLaSemaine(dateReference))
  const jours = useMemo(
    () => Array.from({ length: 5 }, (_, i) => toISODate(ajouterJours(parseISODate(lundi), i))),
    [lundi],
  )
  const vendredi = jours[4]
  const aujourdhui = toISODate(new Date())

  const { seances, evaluations, loading, error, marquerSeanceFaite, marquerEvaluationFaite } = useSemaine(
    anneeActive?.id ?? null,
    lundi,
    vendredi,
  )

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])

  const ressourcePrincipaleParUnite = useMemo(() => {
    const map = new Map<string, Ressource>()
    for (const r of ressources) {
      const existante = map.get(r.unite_id)
      if (!existante || (existante.type !== 'support' && r.type === 'support')) {
        map.set(r.unite_id, r)
      }
    }
    return map
  }, [ressources])

  function matiereDeProgression(progressionId: string) {
    const progression = progressionsParId.get(progressionId)
    return progression ? matieresParId.get(progression.matiere_id) ?? null : null
  }

  const itemsParJour = useMemo(() => {
    const map = new Map<string, ItemJour[]>()
    for (const jour of jours) map.set(jour, [])
    for (const s of seances) {
      map.get(s.date)?.push({ kind: 'seance', heure: s.heure_debut, data: s })
    }
    for (const e of evaluations) {
      map.get(e.date)?.push({ kind: 'evaluation', heure: e.heure_debut, data: e })
    }
    for (const items of map.values()) items.sort((a, b) => a.heure.localeCompare(b.heure))
    return map
  }, [jours, seances, evaluations])

  return (
    <div>
      <h2 className="section-title">Semaine</h2>

      <div className="semaine-toolbar">
        <button type="button" className="btn-sm" onClick={() => setDateReference(toISODate(ajouterJours(parseISODate(lundi), -7)))}>
          ◂ Précédente
        </button>
        <button type="button" className="btn-sm" onClick={() => setDateReference(toISODate(new Date()))}>
          Aujourd'hui
        </button>
        <button type="button" className="btn-sm" onClick={() => setDateReference(toISODate(ajouterJours(parseISODate(lundi), 7)))}>
          Suivante ▸
        </button>
        <span className="semaine-plage">
          {formatPlageSemaine(lundi, vendredi)}
          {anneeActive && (
            <span className="semaine-badge">{calculerSemaine(lundi, anneeActive.reference_semaine_a_date) ?? '?'}</span>
          )}
        </span>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <div className="semaine-jours">
            {jours.map((jour, index) => (
              <div className="semaine-jour" key={jour}>
                <div className={`semaine-jour-header${jour === aujourdhui ? ' aujourdhui' : ''}`}>
                  {NOMS_JOURS[index]} <span className="semaine-jour-date">{formatJour(jour)}</span>
                </div>

                {itemsParJour.get(jour)?.length === 0 && <p className="semaine-jour-vide">Aucun cours</p>}

                {itemsParJour.get(jour)?.map((item) => {
                  const classe = classesParId.get(item.data.planning.classe_id)
                  const matiere = matiereDeProgression(item.data.planning.progression_id)
                  const passee = jour < aujourdhui
                  const estEvaluation = item.kind === 'evaluation'

                  const titre = estEvaluation
                    ? item.data.titre ?? 'Évaluation'
                    : (item.data as SeanceAvecPlanning).override_titre ??
                      unitesParId.get((item.data as SeanceAvecPlanning).unite_id ?? '')?.titre ??
                      '(unité supprimée)'

                  const ressource = !estEvaluation
                    ? ressourcePrincipaleParUnite.get((item.data as SeanceAvecPlanning).unite_id ?? '')
                    : undefined

                  return (
                    <div
                      key={item.data.id}
                      className={`semaine-item${estEvaluation ? ' semaine-item-evaluation' : ''}${passee ? ' semaine-item-passee' : ''}`}
                    >
                      <span className="semaine-item-heure">{formatHeure(item.heure)}</span>
                      <span className="referentiel-group-dot" style={{ background: matiere?.couleur ?? '#999' }} />
                      <span className="semaine-item-corps">
                        <span className="semaine-item-titre">{titre}</span>
                        <span className="semaine-item-classe">
                          {classe?.nom ?? '?'} — {matiere?.nom ?? '?'}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={item.data.statut === 'fait'}
                        onChange={(e) =>
                          estEvaluation
                            ? marquerEvaluationFaite(item.data.id, e.target.checked)
                            : marquerSeanceFaite(item.data.id, e.target.checked)
                        }
                        title="Fait"
                      />
                      {ressource && (
                        <a href={ressource.url} target="_blank" rel="noreferrer" title="Ouvrir la ressource">
                          ↗
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

export default Semaine
