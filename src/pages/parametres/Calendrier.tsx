import { useState } from 'react'
import { useAnneesScolaires } from '../../hooks/useAnneesScolaires'
import { useParametres } from '../../hooks/useParametres'
import { usePeriodesCalendrier } from '../../hooks/usePeriodesCalendrier'
import { ACADEMIES } from '../../lib/calendrierScolaireApi'
import type { TypePeriode } from '../../types/periodeCalendrier'

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function Calendrier() {
  const { annees, loading: anneesLoading } = useAnneesScolaires()
  const { parametres, definirAcademie } = useParametres()
  const anneeActive = annees.find((a) => a.active) ?? null

  const { periodes, loading, error, add, edit, remove, importer } = usePeriodesCalendrier(
    anneeActive?.id ?? null,
  )

  const [importEnCours, setImportEnCours] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const [nouveauNom, setNouveauNom] = useState('')
  const [nouveauDebut, setNouveauDebut] = useState('')
  const [nouveauFin, setNouveauFin] = useState('')
  const [nouveauType, setNouveauType] = useState<TypePeriode>('vacances')

  async function handleImporter() {
    if (!anneeActive || !parametres?.academie) return
    setImportEnCours(true)
    setImportError(null)
    setImportMessage(null)
    try {
      const ajoutees = await importer(parametres.academie, anneeActive)
      setImportMessage(
        ajoutees > 0
          ? `${ajoutees} période(s) importée(s).`
          : 'Aucune nouvelle période à importer pour cette académie et cette année.',
      )
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImportEnCours(false)
    }
  }

  async function handleAjouter() {
    if (!nouveauNom.trim() || !nouveauDebut || !nouveauFin) return
    await add(nouveauNom.trim(), nouveauDebut, nouveauFin, nouveauType)
    setNouveauNom('')
    setNouveauDebut('')
    setNouveauFin('')
    setNouveauType('vacances')
  }

  return (
    <div>
      <h2 className="section-title">Calendrier</h2>
      <p className="section-desc">
        Importe les vacances scolaires depuis l'API du calendrier scolaire de l'Éducation
        nationale, ou saisis manuellement les vacances et jours fériés. Ces périodes sont exclues
        du moteur de projection.
      </p>

      <div className="emploi-toolbar">
        <label className="emploi-toolbar-field">
          Académie
          <select
            className="input-sm"
            value={parametres?.academie ?? ''}
            onChange={(e) => definirAcademie(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {ACADEMIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-sm btn-primary"
          disabled={!anneeActive || !parametres?.academie || importEnCours}
          onClick={handleImporter}
        >
          {importEnCours ? 'Import…' : `Importer${anneeActive ? ` (${anneeActive.libelle})` : ''}`}
        </button>
      </div>

      {importError && <p className="error-text">{importError}</p>}
      {importMessage && <p className="section-desc">{importMessage}</p>}

      {anneesLoading ? null : !anneeActive ? (
        <p className="section-desc">
          Aucune année scolaire active — crée-en une dans Paramètres → Emploi du temps.
        </p>
      ) : (
        <>
          {error && <p className="error-text">{error}</p>}

          {!loading && (
            <div className="card">
              {periodes.map((periode) => (
                <div className="card-row card-row-periode" key={periode.id}>
                  <input
                    type="text"
                    className="input-sm card-row-label"
                    defaultValue={periode.nom}
                    onBlur={(e) => {
                      const nom = e.target.value.trim()
                      if (nom && nom !== periode.nom) edit(periode.id, { nom })
                    }}
                  />
                  <input
                    type="date"
                    className="input-sm"
                    defaultValue={periode.date_debut}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== periode.date_debut) {
                        edit(periode.id, { date_debut: e.target.value })
                      }
                    }}
                  />
                  <input
                    type="date"
                    className="input-sm"
                    defaultValue={periode.date_fin}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== periode.date_fin) {
                        edit(periode.id, { date_fin: e.target.value })
                      }
                    }}
                  />
                  <select
                    className="input-sm"
                    value={periode.type}
                    onChange={(e) => edit(periode.id, { type: e.target.value as TypePeriode })}
                  >
                    <option value="vacances">Vacances</option>
                    <option value="ferie">Férié</option>
                  </select>
                  <span className="periode-badge">
                    {formatDate(periode.date_debut)} → {formatDate(periode.date_fin)}
                  </span>
                  <button
                    type="button"
                    className="btn-sm btn-danger"
                    onClick={() => remove(periode.id)}
                  >
                    Supprimer
                  </button>
                </div>
              ))}

              <div className="card-row card-row-new">
                <input
                  type="text"
                  className="input-sm card-row-label"
                  placeholder="Nom de la période"
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                />
                <input
                  type="date"
                  className="input-sm"
                  value={nouveauDebut}
                  onChange={(e) => setNouveauDebut(e.target.value)}
                />
                <input
                  type="date"
                  className="input-sm"
                  value={nouveauFin}
                  onChange={(e) => setNouveauFin(e.target.value)}
                />
                <select
                  className="input-sm"
                  value={nouveauType}
                  onChange={(e) => setNouveauType(e.target.value as TypePeriode)}
                >
                  <option value="vacances">Vacances</option>
                  <option value="ferie">Férié</option>
                </select>
                <button type="button" className="btn-sm btn-primary" onClick={handleAjouter}>
                  Ajouter
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Calendrier
