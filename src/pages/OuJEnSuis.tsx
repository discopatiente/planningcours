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
          classeNom: classe.nom,
          matiereNom: matiere?.nom ?? '?',
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

  // Longueur de la barre proportionnelle au nombre de chapitres, relative à
  // la progression la plus longue — une classe avec 2 chapitres a une barre
  // visiblement plus courte qu'une classe qui en a 10, plutôt que des barres
  // toutes étirées à la même largeur quel que soit leur contenu.
  const maxChapitres = Math.max(1, ...lignes.map((l) => l.avancement.blocs.length))

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
              <div className="avancement-entete-gauche">
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
              <div className="avancement-legende">
                <span className="avancement-legende-item">
                  <span className="avancement-legende-dot avancement-legende-dot-termine" />
                  Fait
                </span>
                <span className="avancement-legende-item">
                  <span className="avancement-legende-dot" />
                  En cours
                </span>
                <span className="avancement-legende-item">
                  <span className="avancement-legende-dot avancement-legende-dot-a_venir" />
                  À venir
                </span>
                <span className="avancement-legende-item">
                  <span className="avancement-legende-dot avancement-legende-dot-retard" />
                  En retard
                </span>
              </div>
            </div>

            {lignes.length === 0 ? (
              <p className="section-desc">Aucun planning généré pour cette année.</p>
            ) : (
              <>
                <div className="avancement-table-header">
                  <div className="avancement-col-classe">Classe</div>
                  <div className="avancement-barre-col">Progression des chapitres</div>
                  <div className="avancement-col-chapitre">Chapitre en cours</div>
                  <div className="avancement-col-pourcentage">Avancement</div>
                </div>
                <div className="avancement-liste">
                  {lignes.map((ligne) => (
                    <div key={ligne.id} className="avancement-ligne">
                      <div className="avancement-col-classe">
                        <div className="avancement-classe-nom">{ligne.classeNom}</div>
                        <div className="avancement-classe-matiere">
                          <span className="referentiel-group-dot" style={{ background: ligne.couleur }} />
                          {ligne.matiereNom}
                        </div>
                      </div>
                      <div className="avancement-barre-col">
                        {ligne.avancement.blocs.length === 0 ? (
                          <div className="avancement-barre" style={{ width: '100%' }}>
                            <div className="avancement-bloc avancement-bloc-a_venir" style={{ flex: '1 1 0' }}>
                              Aucune unité
                            </div>
                          </div>
                        ) : (
                          <div
                            className="avancement-barre"
                            style={{ width: `${(ligne.avancement.blocs.length / maxChapitres) * 100}%` }}
                          >
                            {ligne.avancement.blocs.map((bloc, index) => (
                              <div
                                key={bloc.id}
                                className={`avancement-bloc avancement-bloc-${bloc.statut}`}
                                style={
                                  bloc.statut === 'termine'
                                    ? { background: ligne.couleur }
                                    : bloc.statut === 'en_cours'
                                      ? {
                                          background: `color-mix(in srgb, ${ligne.couleur} 16%, white)`,
                                          borderColor: ligne.couleur,
                                          color: ligne.couleur,
                                        }
                                      : undefined
                                }
                                title={`${bloc.nom} (${bloc.nbUnites} unité${bloc.nbUnites > 1 ? 's' : ''})`}
                              >
                                {index + 1}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="avancement-col-chapitre">
                        {ligne.avancement.chapitreEnCoursNumero
                          ? `${ligne.avancement.chapitreEnCoursNumero} · ${ligne.avancement.chapitreEnCoursNom}`
                          : '—'}
                      </div>
                      <div className="avancement-col-pourcentage">
                        <div className="avancement-pourcentage-valeur">{ligne.avancement.pourcentage}%</div>
                        <div
                          className={`avancement-statut-texte${ligne.avancement.enRetard ? ' avancement-statut-retard' : ''}`}
                        >
                          {ligne.avancement.enRetard && <span className="avancement-statut-dot" />}
                          {ligne.avancement.statutTexte}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  )
}

export default OuJEnSuis
