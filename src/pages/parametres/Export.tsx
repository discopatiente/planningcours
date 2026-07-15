import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../../hooks/useAnneesScolaires'
import { useClasses } from '../../hooks/useClasses'
import { useMatieres } from '../../hooks/useMatieres'
import { useProgressions } from '../../hooks/useProgressions'
import { useUnites } from '../../hooks/useUnites'
import { usePlannings } from '../../hooks/usePlannings'
import { useSeancesEvaluationsAnnee } from '../../hooks/useSeancesEvaluationsAnnee'
import { construireLignesExport, genererCsv, telechargerFichier } from '../../lib/export'

type ModeExport = 'progression' | 'annee'

function formatDateAffichage(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Export() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { plannings } = usePlannings(anneeActive?.id ?? null)
  const { seances, evaluations, loading, error } = useSeancesEvaluationsAnnee(
    anneeActive?.id ?? null,
    anneeActive?.date_debut ?? '',
    anneeActive?.date_fin ?? '',
  )

  const [mode, setMode] = useState<ModeExport>('annee')
  const [progressionId, setProgressionId] = useState('')

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])

  // Seules les progressions ayant au moins un planning généré pour l'année
  // active sont exportables (une progression peut être partagée par
  // plusieurs classes — l'export d'une progression regroupe tous ses
  // plannings).
  const progressionsExportables = useMemo(() => {
    const idsAvecPlanning = new Set(plannings.map((p) => p.progression_id))
    return progressions.filter((p) => idsAvecPlanning.has(p.id)).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [progressions, plannings])

  const progressionSelectionnee = progressionsParId.get(progressionId) ?? null

  const planningIdsProgression = useMemo(() => {
    if (mode !== 'progression' || !progressionId) return null
    return new Set(plannings.filter((p) => p.progression_id === progressionId).map((p) => p.id))
  }, [mode, progressionId, plannings])

  const lignes = useMemo(() => {
    const seancesFiltrees = planningIdsProgression
      ? seances.filter((s) => planningIdsProgression.has(s.planning_id))
      : seances
    const evaluationsFiltrees = planningIdsProgression
      ? evaluations.filter((e) => planningIdsProgression.has(e.planning_id))
      : evaluations
    return construireLignesExport(seancesFiltrees, evaluationsFiltrees, classesParId, matieresParId, progressionsParId, unitesParId)
  }, [seances, evaluations, planningIdsProgression, classesParId, matieresParId, progressionsParId, unitesParId])

  const pretAExporter = mode === 'annee' || progressionSelectionnee !== null

  const titreExport =
    mode === 'progression' && progressionSelectionnee
      ? `${progressionSelectionnee.nom} (${matieresParId.get(progressionSelectionnee.matiere_id)?.nom ?? '?'})`
      : 'toutes les classes'

  const suffixeFichier =
    mode === 'progression' && progressionSelectionnee ? progressionSelectionnee.nom : 'toutes-classes'

  function handleExportCsv() {
    telechargerFichier(
      genererCsv(lignes),
      `planning-${suffixeFichier}-${anneeActive?.libelle ?? 'annee'}.csv`,
      'text/csv;charset=utf-8;',
    )
  }

  return (
    <div>
      <h2 className="section-title">Export</h2>
      <p className="section-desc no-print">
        Exporte le planning de l'année active, soit pour une progression, soit pour l'année entière.
        Pour le PDF, utilise « Imprimer » puis choisis « Enregistrer au format PDF » dans la boîte de
        dialogue d'impression du navigateur.
      </p>

      {error && <p className="error-text no-print">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <>
            <div className="export-toolbar no-print">
              <label className="modal-field">
                Portée
                <select value={mode} onChange={(e) => setMode(e.target.value as ModeExport)}>
                  <option value="annee">Année entière</option>
                  <option value="progression">Une progression</option>
                </select>
              </label>
              {mode === 'progression' && (
                <label className="modal-field">
                  Progression
                  <select value={progressionId} onChange={(e) => setProgressionId(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {progressionsExportables.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom} ({matieresParId.get(p.matiere_id)?.nom ?? '?'})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                className="btn-sm"
                disabled={!pretAExporter || lignes.length === 0}
                onClick={handleExportCsv}
              >
                Exporter en CSV
              </button>
              <button
                type="button"
                className="btn-sm btn-primary"
                disabled={!pretAExporter || lignes.length === 0}
                onClick={() => window.print()}
              >
                Imprimer / PDF
              </button>
            </div>

            {!pretAExporter ? (
              <p className="section-desc no-print">Choisis une progression à exporter.</p>
            ) : (
              <div className="export-print-zone">
                <h3 className="export-print-titre">
                  Planning — {titreExport} ({anneeActive.libelle})
                </h3>

                {lignes.length === 0 ? (
                  <p className="section-desc">Aucune séance ou évaluation à exporter.</p>
                ) : (
                  <table className="export-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Heure</th>
                        <th>Classe</th>
                        <th>Matière</th>
                        <th>Type</th>
                        <th>Titre</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l, index) => (
                        <tr key={index} className={l.statut === 'Annulée' ? 'export-row-annulee' : undefined}>
                          <td>{formatDateAffichage(l.date)}</td>
                          <td>{l.heure}</td>
                          <td>{l.classe}</td>
                          <td>{l.matiere}</td>
                          <td>{l.type}</td>
                          <td>{l.titre}</td>
                          <td>{l.statut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}

export default Export
