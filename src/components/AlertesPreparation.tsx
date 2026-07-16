import { Megaphone, Package, Printer } from 'lucide-react'

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

interface AlerteDistributionAffichage {
  id: string
  dateSeance: string
  titre: string
  classeNom: string
}

interface AlertesPreparationProps {
  impressions: AlerteImpressionAffichage[]
  distributions: AlerteDistributionAffichage[]
  instructions: AlerteInstructionAffichage[]
}

type AlerteFusionnee =
  | { type: 'impression'; item: AlerteImpressionAffichage }
  | { type: 'distribution'; item: AlerteDistributionAffichage }
  | { type: 'instruction'; item: AlerteInstructionAffichage }

const LIBELLES: Record<AlerteFusionnee['type'], string> = {
  impression: 'Impression à faire',
  distribution: 'Document à distribuer',
  instruction: 'Instruction aux élèves',
}

const ICONES: Record<AlerteFusionnee['type'], typeof Printer> = {
  impression: Printer,
  distribution: Package,
  instruction: Megaphone,
}

function formatDateCourte(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function AlertesPreparation({ impressions, distributions, instructions }: AlertesPreparationProps) {
  const alertes: AlerteFusionnee[] = [
    ...impressions.map((item): AlerteFusionnee => ({ type: 'impression', item })),
    ...distributions.map((item): AlerteFusionnee => ({ type: 'distribution', item })),
    ...instructions.map((item): AlerteFusionnee => ({ type: 'instruction', item })),
  ].sort((a, b) => a.item.dateSeance.localeCompare(b.item.dateSeance))

  if (alertes.length === 0) return null

  return (
    <div>
      <div className="semaine-rail-kicker">Alertes de la semaine ({alertes.length})</div>
      <div className="alertes-liste">
        {alertes.map((alerte) => {
          const Icone = ICONES[alerte.type]
          return (
            <div className="alertes-item" key={`${alerte.type}-${alerte.item.id}`}>
              <Icone size={15} className="alertes-item-icone" />
              <div className="alertes-item-corps">
                <div className="alertes-item-titre">{LIBELLES[alerte.type]}</div>
                <div className="alertes-item-detail">
                  {formatDateCourte(alerte.item.dateSeance)} · {alerte.item.titre} · {alerte.item.classeNom}
                  {alerte.type === 'instruction' && ` : ${alerte.item.instruction}`}
                </div>
                {alerte.type === 'impression' && alerte.item.ressourceUrl && (
                  <a href={alerte.item.ressourceUrl} target="_blank" rel="noreferrer">
                    Ouvrir ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AlertesPreparation
