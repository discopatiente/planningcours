import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../../hooks/useAnneesScolaires'
import { useClasses } from '../../hooks/useClasses'
import { useMatieres } from '../../hooks/useMatieres'
import { useProgressions } from '../../hooks/useProgressions'
import { useUnites } from '../../hooks/useUnites'
import { useGanttData } from '../../hooks/useGanttData'
import { construireLignesExport, genererCsv, telechargerFichier } from '../../lib/export'

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
  const { seances, evaluations, loading, error } = useGanttData(
    anneeActive?.id ?? null,
    anneeActive?.date_debut ?? '',
    anneeActive?.date_fin ?? '',
  )

  const [classeFiltreId, setClasseFiltreId] = useState('')

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])

  const classeFiltre = classesParId.get(classeFiltreId)

  const lignes = useMemo(() => {
    const toutes = construireLignesExport(seances, evaluations, classesParId, matieresParId, progressionsParId, unitesParId)
    return classeFiltre ? toutes.filter((l) => l.classe === classeFiltre.nom) : toutes
  }, [seances, evaluations, classesParId, matieresParId, progressionsParId, unitesParId, classeFiltre])

  function handleExportCsv() {
    const suffixe = classeFiltre ? classeFiltre.nom : 'toutes-classes'
    telechargerFichier(
      genererCsv(lignes),
      `planning-${suffixe}-${anneeActive?.libelle ?? 'annee'}.csv`,
      'text/csv;charset=utf-8;',
    )
  }

  return (
    <div>
      <h2 className="section-title">Export</h2>
      <p className="section-desc no-print">
        Exporte le planning annuel de l'année active. Pour le PDF, utilise « Imprimer » puis choisis
        « Enregistrer au format PDF » dans la boîte de dialogue d'impression du navigateur.
      </p>

      {error && <p className="error-text no-print">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <>
            <div className="export-toolbar no-print">
              <label className="modal-field">
                Classe
                <select value={classeFiltreId} onChange={(e) => setClasseFiltreId(e.target.value)}>
                  <option value="">Toutes les classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn-sm" disabled={lignes.length === 0} onClick={handleExportCsv}>
                Exporter en CSV
              </button>
              <button
                type="button"
                className="btn-sm btn-primary"
                disabled={lignes.length === 0}
                onClick={() => window.print()}
              >
                Imprimer / PDF
              </button>
            </div>

            <div className="export-print-zone">
              <h3 className="export-print-titre">
                Planning annuel — {classeFiltre ? classeFiltre.nom : 'toutes les classes'} ({anneeActive.libelle})
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
          </>
        )
      )}
    </div>
  )
}

export default Export
