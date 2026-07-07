import { useAnneesScolaires } from '../../hooks/useAnneesScolaires'
import { useParametres } from '../../hooks/useParametres'

function Evaluations() {
  const { parametres, loading, error, definirReglesEvaluations } = useParametres()
  const { annees, loading: anneesLoading, definirTrimestres } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null

  return (
    <div>
      <h2 className="section-title">Évaluations</h2>
      <p className="section-desc">
        Ces règles pilotent le placement automatique des évaluations par le moteur de projection :
        un nombre cible par trimestre, sans jamais dépasser le maximum hebdomadaire toutes classes
        confondues (au-delà, l'évaluation est décalée à la semaine suivante disponible).
      </p>

      {error && <p className="error-text">{error}</p>}

      {!loading && parametres && (
        <div className="emploi-toolbar">
          <label className="emploi-toolbar-field">
            Évaluations par trimestre
            <input
              type="number"
              min={0}
              className="input-sm"
              defaultValue={parametres.evaluations_par_trimestre}
              onBlur={(e) => {
                const valeur = Number(e.target.value)
                if (Number.isFinite(valeur) && valeur !== parametres.evaluations_par_trimestre) {
                  definirReglesEvaluations({ evaluations_par_trimestre: valeur })
                }
              }}
            />
          </label>
          <label className="emploi-toolbar-field">
            Maximum par semaine (toutes classes)
            <input
              type="number"
              min={0}
              className="input-sm"
              defaultValue={parametres.max_evaluations_semaine}
              onBlur={(e) => {
                const valeur = Number(e.target.value)
                if (Number.isFinite(valeur) && valeur !== parametres.max_evaluations_semaine) {
                  definirReglesEvaluations({ max_evaluations_semaine: valeur })
                }
              }}
            />
          </label>
        </div>
      )}

      <h3 className="section-title" style={{ marginTop: '2rem' }}>
        Trimestres {anneeActive ? `— ${anneeActive.libelle}` : ''}
      </h3>
      <p className="section-desc">
        Dates de début des trimestres 2 et 3. Laisser vide pour un découpage automatique en trois
        tiers égaux de l'année scolaire.
      </p>

      {anneesLoading ? null : !anneeActive ? (
        <p className="section-desc">
          Aucune année scolaire active — crée-en une dans Paramètres → Emploi du temps.
        </p>
      ) : (
        <div className="emploi-toolbar">
          <label className="emploi-toolbar-field">
            Début trimestre 2
            <input
              type="date"
              className="input-sm"
              defaultValue={anneeActive.trimestre_2_debut ?? ''}
              onBlur={(e) => {
                const valeur = e.target.value || null
                if (valeur !== anneeActive.trimestre_2_debut) {
                  definirTrimestres(anneeActive.id, valeur, anneeActive.trimestre_3_debut)
                }
              }}
            />
          </label>
          <label className="emploi-toolbar-field">
            Début trimestre 3
            <input
              type="date"
              className="input-sm"
              defaultValue={anneeActive.trimestre_3_debut ?? ''}
              onBlur={(e) => {
                const valeur = e.target.value || null
                if (valeur !== anneeActive.trimestre_3_debut) {
                  definirTrimestres(anneeActive.id, anneeActive.trimestre_2_debut, valeur)
                }
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}

export default Evaluations
