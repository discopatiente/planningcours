import { useMemo, useState } from 'react'
import { useAnneesScolaires } from '../hooks/useAnneesScolaires'
import { useClasses } from '../hooks/useClasses'
import { useMatieres } from '../hooks/useMatieres'
import { useProgressions } from '../hooks/useProgressions'
import { useUnites } from '../hooks/useUnites'
import { useRessourcesToutes } from '../hooks/useRessourcesToutes'
import { useSemaine } from '../hooks/useSemaine'
import { useImpressions } from '../hooks/useImpressions'
import { calculerAlertesInstructionsEleves } from '../lib/alertes'
import { ajouterJours, toISODate } from '../lib/dates'
import { lundiDeLaSemaine } from '../lib/semaineAB'
import { construireRessourcesImprimablesParUnite } from '../lib/impressions'
import { LIBELLES_TYPE_RESSOURCE } from '../lib/ressources'
import type { TypeRessource } from '../types/ressource'

function formatDateCourte(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

interface LigneImpression {
  seanceId: string
  ressourceId: string
  date: string
  titreUnite: string
  classeNom: string
  matiereNom: string
  matiereCouleur: string
  ressourceType: TypeRessource
  ressourceLibelle: string | null
  ressourceUrl: string
}

type LigneDistribution = LigneImpression

function Impressions() {
  const { annees } = useAnneesScolaires()
  const anneeActive = annees.find((a) => a.active) ?? null
  const { classes } = useClasses()
  const { matieres } = useMatieres()
  const { progressions } = useProgressions()
  const { unites } = useUnites()
  const { ressources } = useRessourcesToutes()
  const { seances, loading: loadingSeances } = useSemaine(
    anneeActive?.id ?? null,
    anneeActive?.date_debut ?? '',
    anneeActive?.date_fin ?? '',
  )
  const { getEtat, setEtat, loading: loadingEtats } = useImpressions()

  const [afficherHistorique, setAfficherHistorique] = useState(false)

  // Fenêtre "semaine en cours + semaine suivante" utilisée par la synthèse
  // mobile — du lundi de la semaine courante au vendredi de la semaine
  // suivante, contrairement à la checklist desktop qui n'a pas de borne.
  const lunditFenetre = toISODate(lundiDeLaSemaine(toISODate(new Date())))
  const vendrediFenetre = toISODate(ajouterJours(lundiDeLaSemaine(toISODate(new Date())), 11))

  const classesParId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const progressionsParId = useMemo(() => new Map(progressions.map((p) => [p.id, p])), [progressions])
  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])
  const unitesParId = useMemo(() => new Map(unites.map((u) => [u.id, u])), [unites])

  const ressourcesImprimablesParUnite = useMemo(() => construireRessourcesImprimablesParUnite(ressources), [ressources])

  const lignes = useMemo(() => {
    const resultat: LigneImpression[] = []
    for (const s of seances) {
      if (s.statut === 'annulee' || !s.unite_id) continue
      const unite = unitesParId.get(s.unite_id)
      const progression = progressionsParId.get(s.planning.progression_id)
      const matiere = progression ? matieresParId.get(progression.matiere_id) : undefined
      const classe = classesParId.get(s.planning.classe_id)
      const ressourcesUnite = ressourcesImprimablesParUnite.get(s.unite_id) ?? []
      for (const r of ressourcesUnite) {
        resultat.push({
          seanceId: s.id,
          ressourceId: r.id,
          date: s.date,
          titreUnite: s.override_titre ?? unite?.titre ?? '(unité supprimée)',
          classeNom: classe?.nom ?? '?',
          matiereNom: matiere?.nom ?? '?',
          matiereCouleur: matiere?.couleur ?? '#999',
          ressourceType: r.type,
          ressourceLibelle: r.libelle,
          ressourceUrl: r.url,
        })
      }
    }
    resultat.sort((a, b) => a.date.localeCompare(b.date))
    return resultat
  }, [seances, unitesParId, progressionsParId, matieresParId, classesParId, ressourcesImprimablesParUnite])

  const lignesAffichees = useMemo(() => {
    if (afficherHistorique) return lignes
    return lignes.filter((l) => !getEtat(l.seanceId, l.ressourceId).distribue)
  }, [lignes, afficherHistorique, getEtat])

  // Bornes = aujourd'hui -> fin d'année : ces alertes n'ont pas d'état
  // persistant (contrairement à imprimé/distribué), donc une échéance
  // passée sort naturellement de la liste plutôt que d'être cochée.
  const alertesInstructions = useMemo(() => {
    if (!anneeActive) return []
    return calculerAlertesInstructionsEleves(seances, unitesParId, toISODate(new Date()), anneeActive.date_fin).map(
      (a) => ({
        id: a.seance.id,
        dateEcheance: a.dateEcheance,
        titre: a.titre,
        classeNom: classesParId.get(a.seance.planning.classe_id)?.nom ?? '?',
        instruction: a.instruction,
      }),
    )
  }, [seances, unitesParId, anneeActive, classesParId])

  // Synthèse mobile "semaine en cours + semaine suivante" — remplace
  // entièrement, sur mobile, la checklist desktop non bornée ci-dessus.
  const lignesImpressionMobile = useMemo(
    () =>
      lignes.filter(
        (l) => l.date >= lunditFenetre && l.date <= vendrediFenetre && !getEtat(l.seanceId, l.ressourceId).imprime,
      ),
    [lignes, lunditFenetre, vendrediFenetre, getEtat],
  )

  const lignesDistributionMobile = useMemo(() => {
    const resultat: LigneDistribution[] = []
    for (const s of seances) {
      if (s.statut === 'annulee' || !s.unite_id) continue
      if (s.date < lunditFenetre || s.date > vendrediFenetre) continue
      const ressourcesUnite = ressourcesImprimablesParUnite.get(s.unite_id) ?? []
      if (ressourcesUnite.length === 0) continue
      const toutesImprimees = ressourcesUnite.every((r) => getEtat(s.id, r.id).imprime)
      if (!toutesImprimees) continue
      const unite = unitesParId.get(s.unite_id)
      const progression = progressionsParId.get(s.planning.progression_id)
      const matiere = progression ? matieresParId.get(progression.matiere_id) : undefined
      const classe = classesParId.get(s.planning.classe_id)
      for (const r of ressourcesUnite) {
        if (getEtat(s.id, r.id).distribue) continue
        resultat.push({
          seanceId: s.id,
          ressourceId: r.id,
          date: s.date,
          titreUnite: s.override_titre ?? unite?.titre ?? '(unité supprimée)',
          classeNom: classe?.nom ?? '?',
          matiereNom: matiere?.nom ?? '?',
          matiereCouleur: matiere?.couleur ?? '#999',
          ressourceType: r.type,
          ressourceLibelle: r.libelle,
          ressourceUrl: r.url,
        })
      }
    }
    resultat.sort((a, b) => a.date.localeCompare(b.date))
    return resultat
  }, [
    seances,
    unitesParId,
    progressionsParId,
    matieresParId,
    classesParId,
    ressourcesImprimablesParUnite,
    getEtat,
    lunditFenetre,
    vendrediFenetre,
  ])

  const alertesInstructionsMobile = useMemo(() => {
    if (!anneeActive) return []
    return calculerAlertesInstructionsEleves(seances, unitesParId, lunditFenetre, vendrediFenetre).map((a) => ({
      id: a.seance.id,
      dateEcheance: a.dateEcheance,
      titre: a.titre,
      classeNom: classesParId.get(a.seance.planning.classe_id)?.nom ?? '?',
      instruction: a.instruction,
    }))
  }, [seances, unitesParId, anneeActive, classesParId, lunditFenetre, vendrediFenetre])

  const loading = loadingSeances || loadingEtats

  const rienMobile =
    lignesImpressionMobile.length === 0 && lignesDistributionMobile.length === 0 && alertesInstructionsMobile.length === 0

  return (
    <div>
      <h2 className="section-title">Impressions</h2>

      <div className="impressions-desktop">
        <p className="section-desc">
          Ressources à imprimer et à distribuer, classées par date d'utilisation prévue. Cocher « Imprimé »
          retire le rappel d'impression de la vue Semaine et fait apparaître un rappel de distribution ;
          cocher « Distribué » retire ce dernier.
        </p>

        <label className="modal-field-inline" style={{ marginBottom: 12, display: 'inline-flex' }}>
          <input
            type="checkbox"
            checked={afficherHistorique}
            onChange={(e) => setAfficherHistorique(e.target.checked)}
          />
          Afficher aussi les ressources déjà distribuées
        </label>

        {!anneeActive ? (
          <p className="section-desc">Aucune année scolaire active.</p>
        ) : loading ? null : lignesAffichees.length === 0 ? (
          <p className="section-desc">Rien à imprimer pour le moment.</p>
        ) : (
          <div className="card">
            {lignesAffichees.map((l) => {
              const etat = getEtat(l.seanceId, l.ressourceId)
              return (
                <div className="card-row" key={`${l.seanceId}-${l.ressourceId}`}>
                  <span className="alertes-item-date">{formatDateCourte(l.date)}</span>
                  <span className="referentiel-group-dot" style={{ background: l.matiereCouleur }} />
                  <span className="card-row-label">
                    <a href={l.ressourceUrl} target="_blank" rel="noreferrer">
                      {l.ressourceLibelle || LIBELLES_TYPE_RESSOURCE[l.ressourceType]}
                    </a>{' '}
                    — {l.titreUnite} ({LIBELLES_TYPE_RESSOURCE[l.ressourceType]}) — {l.classeNom} — {l.matiereNom}
                  </span>
                  <label className="modal-field-inline">
                    <input
                      type="checkbox"
                      checked={etat.imprime}
                      onChange={(e) => setEtat(l.seanceId, l.ressourceId, { imprime: e.target.checked })}
                    />
                    Imprimé
                  </label>
                  <label className="modal-field-inline">
                    <input
                      type="checkbox"
                      checked={etat.distribue}
                      onChange={(e) => setEtat(l.seanceId, l.ressourceId, { distribue: e.target.checked })}
                    />
                    Distribué
                  </label>
                </div>
              )
            })}
          </div>
        )}

        {anneeActive && alertesInstructions.length > 0 && (
          <>
            <h3 className="section-title" style={{ fontSize: 15, marginTop: 24 }}>
              Instructions élèves à transmettre
            </h3>
            <div className="card">
              {alertesInstructions.map((a) => (
                <div className="card-row" key={a.id}>
                  <span className="alertes-item-date">{formatDateCourte(a.dateEcheance)}</span>
                  <span className="card-row-label">
                    {a.titre} — {a.classeNom} : {a.instruction}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="impressions-mobile">
        <p className="section-desc">Semaine en cours et semaine prochaine.</p>

        {!anneeActive ? (
          <p className="section-desc">Aucune année scolaire active.</p>
        ) : loading ? null : rienMobile ? (
          <p className="section-desc">Rien à signaler pour les deux prochaines semaines.</p>
        ) : (
          <>
            {lignesImpressionMobile.length > 0 && (
              <>
                <h3 className="section-title" style={{ fontSize: 15 }}>
                  À imprimer
                </h3>
                <div className="card">
                  {lignesImpressionMobile.map((l) => {
                    const etat = getEtat(l.seanceId, l.ressourceId)
                    return (
                      <div className="card-row" key={`impr-${l.seanceId}-${l.ressourceId}`}>
                        <span className="alertes-item-date">{formatDateCourte(l.date)}</span>
                        <span className="referentiel-group-dot" style={{ background: l.matiereCouleur }} />
                        <span className="card-row-label">
                          <a href={l.ressourceUrl} target="_blank" rel="noreferrer">
                            {l.ressourceLibelle || LIBELLES_TYPE_RESSOURCE[l.ressourceType]}
                          </a>{' '}
                          — {l.titreUnite} — {l.classeNom}
                        </span>
                        <label className="modal-field-inline">
                          <input
                            type="checkbox"
                            checked={etat.imprime}
                            onChange={(e) => setEtat(l.seanceId, l.ressourceId, { imprime: e.target.checked })}
                          />
                          Imprimé
                        </label>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {lignesDistributionMobile.length > 0 && (
              <>
                <h3 className="section-title" style={{ fontSize: 15, marginTop: 16 }}>
                  À distribuer
                </h3>
                <div className="card">
                  {lignesDistributionMobile.map((l) => (
                    <div className="card-row" key={`dist-${l.seanceId}-${l.ressourceId}`}>
                      <span className="alertes-item-date">{formatDateCourte(l.date)}</span>
                      <span className="referentiel-group-dot" style={{ background: l.matiereCouleur }} />
                      <span className="card-row-label">
                        <a href={l.ressourceUrl} target="_blank" rel="noreferrer">
                          {l.ressourceLibelle || LIBELLES_TYPE_RESSOURCE[l.ressourceType]}
                        </a>{' '}
                        — {l.titreUnite} — {l.classeNom}
                      </span>
                      <label className="modal-field-inline">
                        <input
                          type="checkbox"
                          checked={getEtat(l.seanceId, l.ressourceId).distribue}
                          onChange={(e) => setEtat(l.seanceId, l.ressourceId, { distribue: e.target.checked })}
                        />
                        Distribué
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}

            {alertesInstructionsMobile.length > 0 && (
              <>
                <h3 className="section-title" style={{ fontSize: 15, marginTop: 16 }}>
                  Instructions élèves à transmettre
                </h3>
                <div className="card">
                  {alertesInstructionsMobile.map((a) => (
                    <div className="card-row" key={a.id}>
                      <span className="alertes-item-date">{formatDateCourte(a.dateEcheance)}</span>
                      <span className="card-row-label">
                        {a.titre} — {a.classeNom} : {a.instruction}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Impressions
