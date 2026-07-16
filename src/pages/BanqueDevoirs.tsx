import { Fragment, useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useBanqueDevoirs } from '../hooks/useBanqueDevoirs'
import Modal from '../components/Modal'
import type { BanqueDevoir, NiveauBanqueDevoir } from '../types/banqueDevoir'

const NIVEAUX: NiveauBanqueDevoir[] = ['seconde', 'premiere', 'terminale']

const LIBELLES_NIVEAU: Record<NiveauBanqueDevoir, string> = {
  seconde: 'Seconde',
  premiere: 'Première',
  terminale: 'Terminale',
}

function BanqueDevoirs() {
  const { matieres } = useMatieres()
  const {
    devoirs,
    loading,
    error,
    add: ajouterDevoir,
    edit: editerDevoir,
    remove: supprimerDevoir,
  } = useBanqueDevoirs()

  const [recherche, setRecherche] = useState('')
  const [filtreMatiereId, setFiltreMatiereId] = useState('')
  const [filtreNiveau, setFiltreNiveau] = useState<NiveauBanqueDevoir | ''>('')
  const [devoirSelectionneId, setDevoirSelectionneId] = useState<string | null>(null)

  const [nouveauOuvert, setNouveauOuvert] = useState(false)
  const [nouveauTitre, setNouveauTitre] = useState('')
  const [nouvelleMatiereId, setNouvelleMatiereId] = useState('')
  const [nouveauNiveau, setNouveauNiveau] = useState<NiveauBanqueDevoir>('seconde')

  const matieresParId = useMemo(() => new Map(matieres.map((m) => [m.id, m])), [matieres])

  const devoirsAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    let liste = devoirs.filter(
      (d) =>
        !terme ||
        d.titre.toLowerCase().includes(terme) ||
        (d.notion ?? '').toLowerCase().includes(terme),
    )
    if (filtreMatiereId) liste = liste.filter((d) => d.matiere_id === filtreMatiereId)
    if (filtreNiveau) liste = liste.filter((d) => d.niveau === filtreNiveau)
    return [...liste].sort((a, b) => {
      const matiereA = matieresParId.get(a.matiere_id)?.nom ?? ''
      const matiereB = matieresParId.get(b.matiere_id)?.nom ?? ''
      if (matiereA !== matiereB) return matiereA.localeCompare(matiereB)
      return a.titre.localeCompare(b.titre)
    })
  }, [devoirs, recherche, filtreMatiereId, filtreNiveau, matieresParId])

  function ouvrirNouveau() {
    setNouveauTitre('')
    setNouvelleMatiereId('')
    setNouveauNiveau('seconde')
    setNouveauOuvert(true)
  }

  async function handleCreer() {
    const titre = nouveauTitre.trim()
    if (!titre || !nouvelleMatiereId) return
    const cree = await ajouterDevoir(titre, nouvelleMatiereId, nouveauNiveau)
    setDevoirSelectionneId(cree.id)
    setNouveauOuvert(false)
  }

  async function handleSupprimer(devoir: BanqueDevoir) {
    await supprimerDevoir(devoir.id)
    if (devoirSelectionneId === devoir.id) setDevoirSelectionneId(null)
  }

  return (
    <div>
      <h2 className="section-title">Banque de devoirs</h2>
      <p className="section-desc">
        Réservoir de devoirs réutilisables — titre, matière, niveau, notion et liens vers le sujet
        et le corrigé. Depuis l'onglet Liste des devoirs, un devoir programmé peut être relié à un
        sujet d'ici (colonne « Devoir (banque) ») ; les liens sujet/corrigé affichés là-bas
        proviennent alors de la fiche éditée ici.
      </p>

      {error && <p className="error-text">{error}</p>}

      {!loading && (
        <div className="udc-table-page">
          <div className="udc-table-toolbar">
            <div className="udc-table-filters">
              <select
                className="input-sm"
                value={filtreMatiereId}
                onChange={(e) => setFiltreMatiereId(e.target.value)}
              >
                <option value="">Toutes les matières</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
              <select
                className="input-sm"
                value={filtreNiveau}
                onChange={(e) => setFiltreNiveau(e.target.value as NiveauBanqueDevoir | '')}
              >
                <option value="">Tous les niveaux</option>
                {NIVEAUX.map((n) => (
                  <option key={n} value={n}>
                    {LIBELLES_NIVEAU[n]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="input-sm referentiel-search"
                placeholder="Rechercher un devoir…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>

            <div className="udc-list-actions">
              <button type="button" className="btn-sm btn-primary" onClick={ouvrirNouveau}>
                Nouveau devoir
              </button>
            </div>
          </div>

          {devoirsAffiches.length === 0 ? (
            <p className="section-desc">
              {devoirs.length === 0
                ? 'Aucun devoir dans la banque pour le moment.'
                : 'Aucun devoir ne correspond aux filtres.'}
            </p>
          ) : (
            <div className="udc-table-wrap">
              <table className="udc-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Matière</th>
                    <th>Niveau</th>
                    <th>Notion</th>
                  </tr>
                </thead>
                <tbody>
                  {devoirsAffiches.map((devoir) => {
                    const estOuvert = devoir.id === devoirSelectionneId
                    const matiereDevoir = matieresParId.get(devoir.matiere_id)
                    return (
                      <Fragment key={devoir.id}>
                        <tr
                          className={`udc-table-row${estOuvert ? ' expanded' : ''}`}
                          onClick={() => setDevoirSelectionneId(estOuvert ? null : devoir.id)}
                        >
                          <td className="udc-table-titre">
                            <span className="udc-table-chevron">{estOuvert ? '▾' : '▸'}</span>
                            {devoir.titre}
                          </td>
                          <td>
                            {matiereDevoir && (
                              <span
                                className="referentiel-group-dot"
                                style={{ background: matiereDevoir.couleur }}
                              />
                            )}{' '}
                            {matiereDevoir?.nom ?? '?'}
                          </td>
                          <td>{LIBELLES_NIVEAU[devoir.niveau]}</td>
                          <td>{devoir.notion ?? '—'}</td>
                        </tr>
                        {estOuvert && (
                          <tr className="udc-table-detail-row">
                            <td colSpan={4}>
                              <div className="udc-table-detail">
                                <label className="modal-field">
                                  Titre
                                  <input
                                    type="text"
                                    defaultValue={devoir.titre}
                                    onBlur={(e) => {
                                      const titre = e.target.value.trim()
                                      if (titre && titre !== devoir.titre) {
                                        editerDevoir(devoir.id, { titre })
                                      }
                                    }}
                                  />
                                </label>

                                <label className="modal-field">
                                  Matière
                                  <select
                                    value={devoir.matiere_id}
                                    onChange={(e) => editerDevoir(devoir.id, { matiere_id: e.target.value })}
                                  >
                                    {matieres.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.nom}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="modal-field">
                                  Niveau
                                  <select
                                    value={devoir.niveau}
                                    onChange={(e) =>
                                      editerDevoir(devoir.id, { niveau: e.target.value as NiveauBanqueDevoir })
                                    }
                                  >
                                    {NIVEAUX.map((n) => (
                                      <option key={n} value={n}>
                                        {LIBELLES_NIVEAU[n]}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="modal-field">
                                  Notion
                                  <input
                                    type="text"
                                    defaultValue={devoir.notion ?? ''}
                                    onBlur={(e) => {
                                      const notion = e.target.value.trim()
                                      if (notion !== (devoir.notion ?? '')) {
                                        editerDevoir(devoir.id, { notion: notion || null })
                                      }
                                    }}
                                  />
                                </label>

                                <div className="referentiel-detail-row">
                                  <label className="modal-field">
                                    Lien vers le sujet
                                    <input
                                      type="url"
                                      placeholder="https://…"
                                      defaultValue={devoir.lien_sujet ?? ''}
                                      onBlur={(e) => {
                                        const url = e.target.value.trim()
                                        if (url !== (devoir.lien_sujet ?? '')) {
                                          editerDevoir(devoir.id, { lien_sujet: url || null })
                                        }
                                      }}
                                    />
                                  </label>
                                  <label className="modal-field">
                                    Lien vers le corrigé
                                    <input
                                      type="url"
                                      placeholder="https://…"
                                      defaultValue={devoir.lien_corrige ?? ''}
                                      onBlur={(e) => {
                                        const url = e.target.value.trim()
                                        if (url !== (devoir.lien_corrige ?? '')) {
                                          editerDevoir(devoir.id, { lien_corrige: url || null })
                                        }
                                      }}
                                    />
                                  </label>
                                </div>

                                <div className="modal-actions">
                                  <div style={{ flex: 1 }} />
                                  <button
                                    type="button"
                                    className="btn-sm btn-danger"
                                    onClick={() => handleSupprimer(devoir)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {nouveauOuvert && (
        <Modal title="Nouveau devoir" onClose={() => setNouveauOuvert(false)}>
          <label className="modal-field">
            Titre
            <input
              type="text"
              value={nouveauTitre}
              onChange={(e) => setNouveauTitre(e.target.value)}
              placeholder="ex. DS n°2 — Dérivées"
              autoFocus
            />
          </label>
          <label className="modal-field">
            Matière
            <select value={nouvelleMatiereId} onChange={(e) => setNouvelleMatiereId(e.target.value)}>
              <option value="" disabled>
                Choisir une matière
              </option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field">
            Niveau
            <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value as NiveauBanqueDevoir)}>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {LIBELLES_NIVEAU[n]}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-sm" onClick={() => setNouveauOuvert(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              disabled={!nouveauTitre.trim() || !nouvelleMatiereId}
              onClick={handleCreer}
            >
              Créer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default BanqueDevoirs
