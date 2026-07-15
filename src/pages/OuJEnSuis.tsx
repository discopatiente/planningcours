import { useMemo } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { usePlannings } from '../hooks/usePlannings'
import { useAvancementData } from '../hooks/useAvancementData'
import { calculerAvancement, semaineAnnee } from '../lib/avancement'
import { toISODate } from '../lib/dates'

function OuJEnSuis() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { plannings, loading: planningsLoading, error: erreurPlannings } = usePlannings(anneeActive?.id ?? null)
  const { donnees, loading: donneesLoading, error: erreurDonnees } = useAvancementData(plannings)

  const aujourdhui = toISODate(new Date())

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])

  const lignes = useMemo(() => {
    return plannings
      .map((planning) => {
        const classe = classesParId.get(planning.classe_id)
        const progression = progressionsParId.get(planning.progression_id)
        const matiere = progression ? matieresParId.get(progression.matiere_id) : undefined
        if (!classe || !progression) return null
        const donneesPlanning = donnees.get(planning.id)
        const avancement = calculerAvancement(
          donneesPlanning?.progressionUnites ?? [],
          donneesPlanning?.seances ?? [],
          aujourdhui,
        )
        return {
          id: planning.id,
          label: `${classe.nom} — ${matiere?.nom ?? '?'}`,
          couleur: matiere?.couleur ?? '#999',
          tri: `${classe.nom}|${matiere?.nom ?? ''}`,
          avancement,
        }
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.tri.localeCompare(b.tri))
  }, [plannings, donnees, classesParId, matieresParId, progressionsParId, aujourdhui])

  const semaine = anneeActive ? semaineAnnee(anneeActive.date_debut, anneeActive.date_fin, aujourdhui) : null
  const nbClassesEnRetard = lignes.filter((l) => l.avancement.enRetard).length

  const loading = planningsLoading || donneesLoading
  const error = erreurPlannings || erreurDonnees

  return (
    <div>
      <h2 className="section-title">Où j'en suis</h2>
      <p className="section-desc">
        Avancement de chaque classe dans sa progression, chapitre par chapitre — pas de dimension
        calendaire précise ici (vacances, dates exactes), juste la réponse à « où j'en suis ? ».
      </p>

      {error && <p className="error-text">{error}</p>}

      {!anneeActive ? (
        <p className="section-desc">Aucune année scolaire active.</p>
      ) : (
        !loading && (
          <>
            <div className="avancement-entete">
              {semaine && (
                <span className="avancement-semaine">
                  Semaine {semaine.numero} sur {semaine.total}
                </span>
              )}
              <span className={`avancement-resume${nbClassesEnRetard > 0 ? ' avancement-resume-alerte' : ''}`}>
                {nbClassesEnRetard === 0
                  ? 'Aucune classe en retard'
                  : `${nbClassesEnRetard} classe${nbClassesEnRetard > 1 ? 's' : ''} en retard sur ${lignes.length}`}
              </span>
            </div>

            {lignes.length === 0 ? (
              <p className="section-desc">Aucun planning généré pour cette année.</p>
            ) : (
              <div className="avancement-liste">
                {lignes.map((ligne) => (
                  <div key={ligne.id} className="avancement-ligne">
                    <div className="avancement-ligne-label">{ligne.label}</div>
                    <div className="avancement-barre">
                      {ligne.avancement.blocs.length === 0 ? (
                        <div className="avancement-bloc avancement-bloc-a_venir" style={{ flex: '1 0 0' }}>
                          Aucune unité
                        </div>
                      ) : (
                        ligne.avancement.blocs.map((bloc) => (
                          <div
                            key={bloc.id}
                            className={`avancement-bloc avancement-bloc-${bloc.statut}`}
                            style={{
                              flex: `${bloc.nbUnites} 0 0`,
                              background: bloc.statut === 'a_venir' ? undefined : ligne.couleur,
                            }}
                            title={`${bloc.nom} (${bloc.nbUnites} unité${bloc.nbUnites > 1 ? 's' : ''})`}
                          >
                            {bloc.statut === 'termine' && <span className="avancement-check">✓</span>}
                            <span className="avancement-bloc-nom">{bloc.nom}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <p
                      className={`avancement-position${ligne.avancement.enRetard ? ' avancement-position-retard' : ''}`}
                    >
                      {ligne.avancement.positionLabel}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}

export default OuJEnSuis
