interface AlerteImpressionAffichage {
  id: string
  dateSeance: string
  titre: string
  classeNom: string
  ressourceUrl?: string
}

interface AlerteInstructionAffichage {
  id: string
  dateSeance: string
  titre: string
  classeNom: string
  instruction: string
}

interface AlertesPreparationProps {
  impressions: AlerteImpressionAffichage[]
  instructions: AlerteInstructionAffichage[]
}

function formatDateCourte(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function AlertesPreparation({ impressions, instructions }: AlertesPreparationProps) {
  if (impressions.length === 0 && instructions.length === 0) return null

  return (
    <div className="alertes-bar">
      {impressions.length > 0 && (
        <div className="alertes-section">
          <span className="alertes-titre">🖨️ Impressions à faire cette semaine ({impressions.length})</span>
          <ul className="alertes-liste">
            {impressions.map((a) => (
              <li key={a.id} className="alertes-item">
                <span className="alertes-item-date">{formatDateCourte(a.dateSeance)}</span>
                <span>
                  {a.titre} — {a.classeNom}
                </span>
                {a.ressourceUrl && (
                  <a href={a.ressourceUrl} target="_blank" rel="noreferrer">
                    ↗ Ouvrir
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {instructions.length > 0 && (
        <div className="alertes-section">
          <span className="alertes-titre">📣 Instructions élèves à transmettre cette semaine ({instructions.length})</span>
          <ul className="alertes-liste">
            {instructions.map((a) => (
              <li key={a.id} className="alertes-item">
                <span className="alertes-item-date">{formatDateCourte(a.dateSeance)}</span>
                <span>
                  {a.titre} — {a.classeNom} : {a.instruction}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AlertesPreparation
