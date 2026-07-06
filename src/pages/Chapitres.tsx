import { useEffect, useMemo, useState } from 'react'
import { useMatieres } from '../hooks/useMatieres'
import { useChapitres } from '../hooks/useChapitres'
import { useUnites } from '../hooks/useUnites'
import Modal from '../components/Modal'

function Chapitres() {
  const { matieres } = useMatieres()
  const { chapitres, error, add, edit, remove } = useChapitres()
  const { unites } = useUnites()

  const [recherche, setRecherche] = useState('')
  const [matieresRepliees, setMatieresRepliees] = useState<Set<string>>(new Set())
  const [archivesOuvertes, setArchivesOuvertes] = useState(false)
  const [chapitreSelectionneId, setChapitreSelectionneId] = useState<string | null>(null)

  const [nouveauOuvert, setNouveauOuvert] = useState(false)
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleMatiereId, setNouvelleMatiereId] = useState('')

  const chapitreSelectionne = chapitres.find((c) => c.id === chapitreSelectionneId) ?? null

  const groupesParMatiere = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    return matieres
      .map((matiere) => ({
        matiere,
        chapitres: chapitres.filter(
          (c) =>
            c.matiere_id === matiere.id &&
            !c.archive &&
            (!terme || c.nom.toLowerCase().includes(terme)),
        ),
      }))
      .filter((g) => g.chapitres.length > 0)
  }, [matieres, chapitres, recherche])

  const chapitresArchives = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    return chapitres.filter((c) => c.archive && (!terme || c.nom.toLowerCase().includes(terme)))
  }, [chapitres, recherche])

  const nbUnitesDuChapitre = useMemo(
    () => unites.filter((u) => u.chapitre_id === chapitreSelectionneId).length,
    [unites, chapitreSelectionneId],
  )

  const matiereDuChapitreSelectionne = chapitreSelectionne
    ? matieres.find((m) => m.id === chapitreSelectionne.matiere_id)
    : null

  useEffect(() => {
    if (chapitreSelectionneId && !chapitres.some((c) => c.id === chapitreSelectionneId)) {
      setChapitreSelectionneId(null)
    }
  }, [chapitreSelectionneId, chapitres])

  function toggleMatiere(id: string) {
    setMatieresRepliees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreer() {
    const nom = nouveauNom.trim()
    if (!nom || !nouvelleMatiereId) return
    const cree = await add(nom, nouvelleMatiereId)
    setChapitreSelectionneId(cree.id)
    setNouveauNom('')
    setNouvelleMatiereId('')
    setNouveauOuvert(false)
  }

  async function handleToggleArchive() {
    if (!chapitreSelectionne) return
    await edit(chapitreSelectionne.id, { archive: !chapitreSelectionne.archive })
  }

  async function handleSupprimer() {
    if (!chapitreSelectionne) return
    await remove(chapitreSelectionne.id)
    setChapitreSelectionneId(null)
  }

  return (
    <div>
      <h2 className="section-title">Chapitres</h2>
      <p className="section-desc">
        Regroupe les unités de cours en chapitres réutilisables. Un chapitre archivé disparait de
        la vue courante mais reste piochable pour construire une progression — ce n'est jamais une
        suppression.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="referentiel-layout">
        <div className="referentiel-list">
          <input
            type="text"
            className="input-sm referentiel-search"
            placeholder="Rechercher un chapitre…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />

          {groupesParMatiere.map(({ matiere, chapitres: chapitresMatiere }) => {
            const repliee = matieresRepliees.has(matiere.id)
            return (
              <div className="referentiel-group" key={matiere.id}>
                <button
                  type="button"
                  className="referentiel-group-header"
                  onClick={() => toggleMatiere(matiere.id)}
                >
                  <span className="referentiel-group-dot" style={{ background: matiere.couleur }} />
                  {matiere.nom}
                  <span className="referentiel-group-count">{chapitresMatiere.length}</span>
                  <span>{repliee ? '▸' : '▾'}</span>
                </button>
                {!repliee &&
                  chapitresMatiere.map((chapitre) => (
                    <div
                      key={chapitre.id}
                      className={`referentiel-unite-item${chapitre.id === chapitreSelectionneId ? ' selected' : ''}`}
                      onClick={() => setChapitreSelectionneId(chapitre.id)}
                    >
                      {chapitre.nom}
                    </div>
                  ))}
              </div>
            )
          })}

          {groupesParMatiere.length === 0 && (
            <p className="section-desc">
              {recherche ? 'Aucun chapitre ne correspond à la recherche.' : 'Aucun chapitre pour le moment.'}
            </p>
          )}

          <button type="button" className="btn-sm btn-primary" onClick={() => setNouveauOuvert(true)}>
            Nouveau chapitre
          </button>

          <div className="udc-archives-section">
            <button
              type="button"
              className="referentiel-group-header"
              onClick={() => setArchivesOuvertes((v) => !v)}
            >
              Archives
              <span className="referentiel-group-count">{chapitresArchives.length}</span>
              <span>{archivesOuvertes ? '▾' : '▸'}</span>
            </button>
            {archivesOuvertes &&
              chapitresArchives.map((chapitre) => {
                const matiereChapitre = matieres.find((m) => m.id === chapitre.matiere_id)
                return (
                  <div
                    key={chapitre.id}
                    className={`referentiel-unite-item${chapitre.id === chapitreSelectionneId ? ' selected' : ''}`}
                    onClick={() => setChapitreSelectionneId(chapitre.id)}
                  >
                    <span
                      className="referentiel-group-dot"
                      style={{ background: matiereChapitre?.couleur, marginRight: 8 }}
                    />
                    {chapitre.nom}
                  </div>
                )
              })}
            {archivesOuvertes && chapitresArchives.length === 0 && (
              <p className="section-desc" style={{ margin: '8px 12px' }}>
                Aucun chapitre archivé.
              </p>
            )}
          </div>
        </div>

        {chapitreSelectionne ? (
          <div className="referentiel-detail" key={chapitreSelectionne.id}>
            <label className="modal-field">
              Nom
              <input
                type="text"
                defaultValue={chapitreSelectionne.nom}
                onBlur={(e) => {
                  const nom = e.target.value.trim()
                  if (nom && nom !== chapitreSelectionne.nom) {
                    edit(chapitreSelectionne.id, { nom })
                  }
                }}
              />
            </label>

            <label className="modal-field">
              Matière
              <input type="text" value={matiereDuChapitreSelectionne?.nom ?? ''} disabled />
            </label>

            <p className="section-desc" style={{ margin: 0 }}>
              {nbUnitesDuChapitre} unité{nbUnitesDuChapitre > 1 ? 's' : ''} dans ce chapitre.
              Gère-les depuis l'onglet Unités de cours.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn-sm" onClick={handleToggleArchive}>
                {chapitreSelectionne.archive ? 'Désarchiver' : 'Archiver'}
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" className="btn-sm btn-danger" onClick={handleSupprimer}>
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="referentiel-detail-empty">Sélectionne un chapitre à gauche.</div>
        )}
      </div>

      {nouveauOuvert && (
        <Modal title="Nouveau chapitre" onClose={() => setNouveauOuvert(false)}>
          <label className="modal-field">
            Nom
            <input
              type="text"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              placeholder="ex. Fractions"
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
          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-sm" onClick={() => setNouveauOuvert(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              disabled={!nouveauNom.trim() || !nouvelleMatiereId}
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

export default Chapitres
