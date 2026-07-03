import { useState } from 'react'
import { useMatieres } from '../../hooks/useMatieres'

const COULEUR_PAR_DEFAUT = '#7F77DD'

function Matieres() {
  const { matieres, loading, error, add, edit, remove } = useMatieres()
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleCouleur, setNouvelleCouleur] = useState(COULEUR_PAR_DEFAUT)

  async function handleAjouter() {
    const nom = nouveauNom.trim()
    if (!nom) return
    await add(nom, nouvelleCouleur)
    setNouveauNom('')
    setNouvelleCouleur(COULEUR_PAR_DEFAUT)
  }

  return (
    <div>
      <h2 className="section-title">Matières</h2>
      <p className="section-desc">
        Définis les matières que tu enseignes et leur couleur associée. Cette couleur sera utilisée
        dans toutes les vues (semaine, Gantt, référentiel).
      </p>

      {error && <p className="error-text">{error}</p>}

      {!loading && (
        <div className="card">
          {matieres.map((matiere) => (
            <div className="card-row" key={matiere.id}>
              <input
                type="color"
                className="color-swatch"
                value={matiere.couleur}
                onChange={(e) => edit(matiere.id, { couleur: e.target.value })}
                aria-label={`Couleur de ${matiere.nom}`}
              />
              <input
                type="text"
                className="input-sm card-row-label"
                defaultValue={matiere.nom}
                onBlur={(e) => {
                  const nom = e.target.value.trim()
                  if (nom && nom !== matiere.nom) edit(matiere.id, { nom })
                }}
              />
              <button
                type="button"
                className="btn-sm btn-danger"
                onClick={() => remove(matiere.id)}
              >
                Supprimer
              </button>
            </div>
          ))}

          <div className="card-row">
            <input
              type="color"
              className="color-swatch"
              value={nouvelleCouleur}
              onChange={(e) => setNouvelleCouleur(e.target.value)}
              aria-label="Couleur de la nouvelle matière"
            />
            <input
              type="text"
              className="input-sm card-row-label"
              placeholder="Nouvelle matière"
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
    </div>
  )
}

export default Matieres
