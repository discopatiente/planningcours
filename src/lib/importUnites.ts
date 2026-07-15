import type { Chapitre } from '../types/chapitre'
import type { Matiere } from '../types/matiere'
import { createChapitre } from './chapitres'
import { createRessource } from './ressources'
import { assignUniteToChapitre, createUnite } from './unites'
import { messageErreur } from './erreurs'

export interface LigneImportUnite {
  numeroLigne: number
  titre: string
  matiereNom: string
  chapitreNom: string
  lienRessource: string
}

export interface ErreurImportUnite {
  numeroLigne: number
  message: string
}

export interface ResultatImportUnites {
  unitesCreees: number
  chapitresCrees: string[]
  erreurs: ErreurImportUnite[]
}

export type SeparateurCsv = 'auto' | ';' | ','

// Repère le séparateur le plus probable à partir de la ligne d'en-tête :
// compte les ';' et ',' hors guillemets, le plus fréquent gagne (à égalité,
// ';' — format français, cohérent avec l'export CSV existant).
function detecterSeparateur(premiereLigne: string): ';' | ',' {
  let dansGuillemets = false
  let nbPointVirgule = 0
  let nbVirgule = 0
  for (const c of premiereLigne) {
    if (c === '"') dansGuillemets = !dansGuillemets
    else if (!dansGuillemets && c === ';') nbPointVirgule++
    else if (!dansGuillemets && c === ',') nbVirgule++
  }
  return nbVirgule > nbPointVirgule ? ',' : ';'
}

// Découpe un CSV en respectant les champs entre guillemets (guillemets
// doublés pour l'échappement). Séparateur ';' (format français) ou ','
// selon `separateur` — 'auto' détecte à partir de l'en-tête. Tolère un BOM
// UTF-8 en tête de fichier.
function parseCsvBrut(texte: string, separateur: SeparateurCsv = 'auto'): string[][] {
  const source = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte
  const sep = separateur === 'auto' ? detecterSeparateur(source.split(/\r?\n/, 1)[0] ?? '') : separateur
  const lignes: string[][] = []
  let ligne: string[] = []
  let champ = ''
  let dansGuillemets = false

  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (dansGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          champ += '"'
          i++
        } else {
          dansGuillemets = false
        }
      } else {
        champ += c
      }
      continue
    }
    if (c === '"') {
      dansGuillemets = true
    } else if (c === sep) {
      ligne.push(champ)
      champ = ''
    } else if (c === '\r') {
      // ignoré, traité avec le \n suivant
    } else if (c === '\n') {
      ligne.push(champ)
      lignes.push(ligne)
      ligne = []
      champ = ''
    } else {
      champ += c
    }
  }
  if (champ !== '' || ligne.length > 0) {
    ligne.push(champ)
    lignes.push(ligne)
  }

  return lignes.filter((l) => !(l.length === 1 && l[0].trim() === ''))
}

function retirerAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normaliserEntete(s: string): string {
  return retirerAccents(s).toLowerCase().replace(/[^a-z]/g, '')
}

function normaliserNom(s: string): string {
  return retirerAccents(s).toLowerCase().trim()
}

export function parseCsvUnites(
  contenu: string,
  separateur: SeparateurCsv = 'auto',
): {
  lignes: LigneImportUnite[]
  erreurEntete: string | null
} {
  const lignesBrutes = parseCsvBrut(contenu, separateur)
  if (lignesBrutes.length === 0) {
    return { lignes: [], erreurEntete: 'Le fichier est vide.' }
  }

  const entete = lignesBrutes[0].map(normaliserEntete)
  const indexTitre = entete.indexOf('titre')
  const indexMatiere = entete.indexOf('matiere')
  const indexChapitre = entete.indexOf('chapitre')
  const indexLien = entete.findIndex((e) => e.includes('lien'))

  if (indexTitre === -1 || indexMatiere === -1 || indexChapitre === -1) {
    return {
      lignes: [],
      erreurEntete:
        'En-tête invalide : colonnes attendues « Titre », « Matière » et « Chapitre » ' +
        '(+ « Lien ressource », facultative). Séparateur attendu : point-virgule ou virgule.',
    }
  }

  const lignes = lignesBrutes.slice(1).map((champs, i) => ({
    numeroLigne: i + 2,
    titre: (champs[indexTitre] ?? '').trim(),
    matiereNom: (champs[indexMatiere] ?? '').trim(),
    chapitreNom: (champs[indexChapitre] ?? '').trim(),
    lienRessource: indexLien === -1 ? '' : (champs[indexLien] ?? '').trim(),
  }))

  return { lignes, erreurEntete: null }
}

// Une ligne = une unité. Une matière inconnue bloque la ligne (les matières
// portent une couleur choisie à la main dans Paramètres, on n'en crée pas à
// la volée). Un chapitre inconnu est créé automatiquement dans la matière
// correspondante — les chapitres sont des conteneurs légers et réutilisables.
export async function importerUnites(
  lignes: LigneImportUnite[],
  matieres: Matiere[],
  chapitresExistants: Chapitre[],
): Promise<ResultatImportUnites> {
  const erreurs: ErreurImportUnite[] = []
  const chapitresCrees: string[] = []
  const chapitresConnus = [...chapitresExistants]
  let unitesCreees = 0

  for (const ligne of lignes) {
    if (!ligne.titre) {
      erreurs.push({ numeroLigne: ligne.numeroLigne, message: 'Titre manquant.' })
      continue
    }
    if (!ligne.matiereNom) {
      erreurs.push({ numeroLigne: ligne.numeroLigne, message: 'Matière manquante.' })
      continue
    }
    const matiere = matieres.find((m) => normaliserNom(m.nom) === normaliserNom(ligne.matiereNom))
    if (!matiere) {
      erreurs.push({
        numeroLigne: ligne.numeroLigne,
        message: `Matière inconnue : « ${ligne.matiereNom} ». Crée-la d'abord dans Paramètres.`,
      })
      continue
    }

    let chapitreId: string | null = null
    if (ligne.chapitreNom) {
      let chapitre = chapitresConnus.find(
        (c) => c.matiere_id === matiere.id && normaliserNom(c.nom) === normaliserNom(ligne.chapitreNom),
      )
      if (!chapitre) {
        try {
          chapitre = await createChapitre(ligne.chapitreNom, matiere.id)
          chapitresConnus.push(chapitre)
          chapitresCrees.push(chapitre.nom)
        } catch (err) {
          erreurs.push({
            numeroLigne: ligne.numeroLigne,
            message: `Échec de création du chapitre « ${ligne.chapitreNom} » : ${messageErreur(err)}`,
          })
          continue
        }
      }
      chapitreId = chapitre.id
    }

    try {
      const unite = await createUnite(ligne.titre, matiere.id)
      if (chapitreId) await assignUniteToChapitre(unite.id, chapitreId)
      if (ligne.lienRessource) {
        await createRessource(unite.id, 'support', ligne.lienRessource, null)
      }
      unitesCreees++
    } catch (err) {
      erreurs.push({ numeroLigne: ligne.numeroLigne, message: messageErreur(err) })
    }
  }

  return { unitesCreees, chapitresCrees, erreurs }
}
