import { useMemo } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { usePeriodesCalendrier } from '../hooks/usePeriodesCalendrier'
import { useFriseData } from '../hooks/useFriseData'
import { bornesTrimestres } from '../lib/projectionEngine'
import {
  construireLignesFrise,
  construireMarqueursTrimestre,
  construirePointsFrise,
  construireZonesFrise,
  pctAujourdhuiDansLigne,
  pctJour,
} from '../lib/frise'
import { toISODate, parseISODate } from '../lib/dates'
import type { EvaluationAvecPlanning } from '../types/evaluation'

const COULEUR_EVALUATION = '#D85A30'
const LARGEUR_LABEL = 140
// Jours de repère affichés en pointillé léger dans chaque ligne, pour situer
// les évaluations sans avoir à compter les colonnes.
const JOURS_REPERE = [8, 15, 22, 29]

function libellePoint(evaluations: EvaluationAvecPlanning[], resoudre: (e: EvaluationAvecPlanning) => string) {
  return evaluations.map(resoudre).join(', ')
}

function Frise() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { periodes } = usePeriodesCalendrier(anneeActive?.id ?? null)
  const { evaluations, loading, error } = useFriseData(anneeActive?.id ?? null)

  const aujourdhui = toISODate(new Date())

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])

  function resoudreLibelle(e: EvaluationAvecPlanning): string {
    const classe = classesParId.get(e.planning.classe_id)
    const progression = progressionsParId.get(e.planning.progression_id)
    const matiere = progression ? matieresParId.get(progression.matiere_id) : undefined
    return `${classe?.nom ?? '?'} — ${matiere?.nom ?? '?'}`
  }

  const bornes = useMemo(() => (anneeActive ? bornesTrimestres(anneeActive) : []), [anneeActive])

  const lignes = useMemo(
    () => (anneeActive ? construireLignesFrise(anneeActive.date_debut, anneeActive.date_fin) : []),
    [anneeActive],
  )

  return (
    <div>
      <h2 className="section-title">Frise des évaluations</h2>
      <p className="section-desc">
        Vue d'ensemble des dates d'évaluation sur toute l'année, toutes classes confondues — une
        ligne par mois. Utile pour repérer les périodes chargées et vérifier l'effet du plafond
        hebdomadaire (réglable dans Paramètres → Évaluations).
      </p>

      <div className="frise-legende">
        <span className="frise-legende-item">
          <span className="frise-legende-point" style={{ background: COULEUR_EVALUATION }} /> Évaluation
        </span>
        <span className="frise-legende-item">
          <span className="frise-legende-hachure" /> Vacances / férié
        </span>
        <span className="frise-legende-item">
          <span className="frise-legende-trait" /> Début de trimestre
        </span>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <div className="frise-wrapper">
            {lignes.map((ligne) => {
              const zones = construireZonesFrise(periodes, ligne)
              const marqueurs = construireMarqueursTrimestre(bornes, ligne)
              const points = construirePointsFrise(evaluations, ligne, aujourdhui)
              const aujourdhuiPct = pctAujourdhuiDansLigne(aujourdhui, ligne)
              return (
                <div className="frise-row" key={ligne.id} style={{ gridTemplateColumns: `${LARGEUR_LABEL}px 1fr` }}>
                  <div className="frise-row-label">{ligne.label}</div>
                  <div className="frise-row-timeline">
                    {JOURS_REPERE.map((j) => (
                      <div key={j} className="frise-repere" style={{ left: `${pctJour(j)}%` }} />
                    ))}
                    {zones.map((z) => (
                      <div
                        key={z.id}
                        className="frise-zone"
                        style={{ left: `${z.leftPct}%`, width: `${z.widthPct}%` }}
                      />
                    ))}
                    {marqueurs.map((m) => (
                      <div key={m.id} className="frise-marqueur" style={{ left: `${m.leftPct}%` }}>
                        <span className="frise-marqueur-label">{m.label}</span>
                      </div>
                    ))}
                    {aujourdhuiPct !== null && (
                      <div className="frise-aujourdhui" style={{ left: `${aujourdhuiPct}%` }} />
                    )}
                    {points.map((p) => {
                      const jour = parseISODate(p.date).getDate()
                      const titre = `${p.evaluations.length} évaluation${p.evaluations.length > 1 ? 's' : ''} — ${libellePoint(p.evaluations, resoudreLibelle)}`
                      return (
                        <div
                          key={p.id}
                          className={`frise-point${p.passee ? ' frise-point-passee' : ''}`}
                          style={{ left: `${pctJour(jour)}%`, background: COULEUR_EVALUATION }}
                          title={titre}
                        >
                          {p.evaluations.length > 1 && <span className="frise-point-count">{p.evaluations.length}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

export default Frise
