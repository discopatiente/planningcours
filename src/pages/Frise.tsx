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
  jourAujourdhuiDansLigne,
} from '../lib/frise'
import { toISODate } from '../lib/dates'
import type { EvaluationAvecPlanning } from '../types/evaluation'

const COULEUR_EVALUATION = '#D85A30'
const LARGEUR_LABEL = 140
const JOURS_MOIS_MAX = 31
const NUMEROS_JOURS = Array.from({ length: JOURS_MOIS_MAX }, (_, i) => i + 1)
const COLONNES_GRILLE = `${LARGEUR_LABEL}px repeat(${JOURS_MOIS_MAX}, minmax(0, 1fr))`

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
            <div className="frise-header" style={{ gridTemplateColumns: COLONNES_GRILLE }}>
              <div className="frise-header-corner" />
              {NUMEROS_JOURS.map((jour) => (
                <div key={jour} className="frise-header-jour">
                  {jour}
                </div>
              ))}
            </div>

            {lignes.map((ligne) => {
              const zones = construireZonesFrise(periodes, ligne)
              const marqueurs = construireMarqueursTrimestre(bornes, ligne)
              const points = construirePointsFrise(evaluations, ligne, aujourdhui)
              const jourAujourdhui = jourAujourdhuiDansLigne(aujourdhui, ligne)
              const joursDeLigne = Array.from(
                { length: ligne.jourFin - ligne.jourDebut + 1 },
                (_, i) => ligne.jourDebut + i,
              )
              return (
                <div className="frise-row" key={ligne.id} style={{ gridTemplateColumns: COLONNES_GRILLE }}>
                  <div className="frise-row-label">{ligne.label}</div>
                  {joursDeLigne.map((jour) => (
                    <div key={jour} className="frise-jour-cell" style={{ gridColumn: `${jour + 1} / span 1` }} />
                  ))}
                  {zones.map((z) => (
                    <div
                      key={z.id}
                      className="frise-zone"
                      style={{ gridColumn: `${z.jourDebut + 1} / span ${z.nbJours}` }}
                    />
                  ))}
                  {marqueurs.map((m) => (
                    <div key={m.id} className="frise-marqueur" style={{ gridColumn: `${m.jour + 1} / span 1` }}>
                      <span className="frise-marqueur-label">{m.label}</span>
                    </div>
                  ))}
                  {jourAujourdhui !== null && (
                    <div className="frise-aujourdhui" style={{ gridColumn: `${jourAujourdhui + 1} / span 1` }} />
                  )}
                  {points.map((p) => {
                    const titre = `${p.evaluations.length} évaluation${p.evaluations.length > 1 ? 's' : ''} — ${libellePoint(p.evaluations, resoudreLibelle)}`
                    return (
                      <div
                        key={p.id}
                        className={`frise-point${p.passee ? ' frise-point-passee' : ''}`}
                        style={{ gridColumn: `${p.jour + 1} / span 1`, background: COULEUR_EVALUATION }}
                        title={titre}
                      >
                        {p.evaluations.length > 1 && <span className="frise-point-count">{p.evaluations.length}</span>}
                      </div>
                    )
                  })}
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
