import { useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useEleves } from '../hooks/useEleves'
import { useAbsences } from '../hooks/useAbsences'
import { rattrapagesEnAttente } from '../lib/absences'

function Eleves() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const [classeId, setClasseId] = useState('')
  const { eleves, loading, add, edit, remove } = useEleves(classeId || null)
  const { absences, evaluations, loading: loadingAbsences } = useAbsences(anneeActive?.id ?? null)

  const [nouveauNom, setNouveauNom] = useState('')
  const [nouveauPrenom, setNouveauPrenom] = useState('')

  async function handleAjouter() {
    const nom = nouveauNom.trim()
    const prenom = nouveauPrenom.trim()
    if (!nom || !prenom) return
    await add(nom, prenom)
    setNouveauNom('')
    setNouveauPrenom('')
  }

  const rattrapages = classeId ? rattrapagesEnAttente(classeId, absences, eleves, evaluations) : []

  return (
    <div>
      <h2 className="section-title">Élèves</h2>
      <p className="section-desc">
        Liste des élèves par classe. Les absences aux devoirs se cochent depuis le panneau d'une évaluation
        dans la vue Semaine ; elles apparaissent ici tant qu'aucun créneau de rattrapage ne leur a été attaché.
      </p>

      <label className="modal-field" style={{ marginBottom: 16, maxWidth: 240 }}>
        Classe
        <select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
          <option value="">Choisir une classe…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>

      {!classeId ? (
        <p className="section-desc">Sélectionne une classe pour voir sa liste d'élèves.</p>
      ) : (
        <>
          {!loading && (
            <div className="card" style={{ marginBottom: 24 }}>
              {eleves.map((eleve) => (
                <div className="card-row" key={eleve.id}>
                  <input
                    type="text"
                    className="input-sm card-row-label"
                    defaultValue={eleve.prenom}
                    onBlur={(e) => {
                      const prenom = e.target.value.trim()
                      if (prenom && prenom !== eleve.prenom) edit(eleve.id, { prenom })
                    }}
                  />
                  <input
                    type="text"
                    className="input-sm card-row-label"
                    defaultValue={eleve.nom}
                    onBlur={(e) => {
                      const nom = e.target.value.trim()
                      if (nom && nom !== eleve.nom) edit(eleve.id, { nom })
                    }}
                  />
                  <button type="button" className="btn-sm btn-danger" onClick={() => remove(eleve.id)}>
                    Supprimer
                  </button>
                </div>
              ))}

              <div className="card-row">
                <input
                  type="text"
                  className="input-sm card-row-label"
                  placeholder="Prénom"
                  value={nouveauPrenom}
                  onChange={(e) => setNouveauPrenom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAjouter()
                  }}
                />
                <input
                  type="text"
                  className="input-sm card-row-label"
                  placeholder="Nom"
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAjouter()
                  }}
                />
                <button type="button" className="btn-sm btn-primary" onClick={handleAjouter}>
                  Ajouter
                </button>
              </div>
            </div>
          )}

          <h3 className="section-title" style={{ fontSize: 15 }}>
            Rattrapages en attente
          </h3>
          {!loadingAbsences &&
            (rattrapages.length === 0 ? (
              <p className="section-desc">Aucun rattrapage en attente pour cette classe.</p>
            ) : (
              <div className="card">
                {rattrapages.map((r) => (
                  <div className="card-row" key={r.absenceId}>
                    <span className="card-row-label">
                      {r.nomComplet} — {r.libelle}
                    </span>
                  </div>
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  )
}

export default Eleves
