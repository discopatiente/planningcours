import type { SeanceAvecPlanning } from '../types/seance'
import type { EvaluationAvecPlanning } from '../types/evaluation'
import type { Unite } from '../types/unite'
import type { Classe } from '../types/classe'
import type { Matiere } from '../types/matiere'
import type { Progression } from '../types/progression'

export interface LigneExport {
  date: string
  heure: string
  classe: string
  matiere: string
  type: 'Séance' | 'Évaluation'
  titre: string
  statut: string
}

const LIBELLES_STATUT_SEANCE: Record<string, string> = {
  a_venir: 'À venir',
  fait: 'Fait',
  annulee: 'Annulée',
  deplacee: 'Déplacée',
}

const LIBELLES_STATUT_EVALUATION: Record<string, string> = {
  a_venir: 'À venir',
  fait: 'Fait',
  annulee: 'Annulée',
}

/**
 * Aplati séances et évaluations d'une année scolaire en lignes homogènes,
 * triées chronologiquement, réutilisables pour l'export CSV comme pour
 * l'aperçu imprimable.
 */
export function construireLignesExport(
  seances: SeanceAvecPlanning[],
  evaluations: EvaluationAvecPlanning[],
  classesParId: Map<string, Classe>,
  matieresParId: Map<string, Matiere>,
  progressionsParId: Map<string, Progression>,
  unitesParId: Map<string, Unite>,
): LigneExport[] {
  function matiereDeProgression(progressionId: string): Matiere | undefined {
    const progression = progressionsParId.get(progressionId)
    return progression ? matieresParId.get(progression.matiere_id) : undefined
  }

  const lignesSeances: LigneExport[] = seances.map((s) => ({
    date: s.date,
    heure: s.heure_debut.slice(0, 5),
    classe: classesParId.get(s.planning.classe_id)?.nom ?? '?',
    matiere: matiereDeProgression(s.planning.progression_id)?.nom ?? '?',
    type: 'Séance',
    titre:
      s.override_titre ??
      unitesParId.get(s.unite_id ?? '')?.titre ??
      (s.statut === 'annulee' ? 'Séance annulée' : '(unité supprimée)'),
    statut: LIBELLES_STATUT_SEANCE[s.statut] ?? s.statut,
  }))

  const lignesEvaluations: LigneExport[] = evaluations.map((e) => ({
    date: e.date,
    heure: e.heure_debut.slice(0, 5),
    classe: classesParId.get(e.planning.classe_id)?.nom ?? '?',
    matiere: matiereDeProgression(e.planning.progression_id)?.nom ?? '?',
    type: 'Évaluation',
    titre: e.titre ?? 'Évaluation',
    statut: LIBELLES_STATUT_EVALUATION[e.statut] ?? e.statut,
  }))

  return [...lignesSeances, ...lignesEvaluations].sort((a, b) =>
    a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date),
  )
}

function echapperCsv(valeur: string): string {
  return /[;"\n]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur
}

// Délimiteur `;` et BOM UTF-8 : Excel en configuration française attend ce
// séparateur (la virgule est déjà le séparateur décimal) et le BOM pour
// afficher correctement les caractères accentués sans réglage manuel.
export function genererCsv(lignes: LigneExport[]): string {
  const entetes = ['Date', 'Heure', 'Classe', 'Matière', 'Type', 'Titre', 'Statut']
  const corps = lignes.map((l) =>
    [l.date, l.heure, l.classe, l.matiere, l.type, l.titre, l.statut].map(echapperCsv).join(';'),
  )
  const BOM_UTF8 = '﻿'
  return BOM_UTF8 + [entetes.join(';'), ...corps].join('\r\n')
}

export function telechargerFichier(contenu: string, nomFichier: string, type: string): void {
  const blob = new Blob([contenu], { type })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
}
