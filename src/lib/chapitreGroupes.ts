export interface GroupeChapitre<T> {
  cle: string
  chapitreId: string | null
  chapitreNom: string
  entrees: T[]
}

/**
 * Regroupe une liste ordonnée d'éléments par chapitre, par tranches
 * contiguës selon l'ordre réel de la liste — jamais par un tri global qui
 * trahirait cet ordre (celui utilisé par le moteur de projection). Deux
 * passages non contigus par le même chapitre donnent donc deux groupes
 * distincts. Partagé entre la vue Progressions (unités d'une progression)
 * et le tableau de bord d'avancement (chapitres d'un planning).
 */
export function grouperParChapitre<T>(
  items: T[],
  chapitreIdDe: (item: T) => string | null,
  chapitreNomDe: (item: T) => string,
): GroupeChapitre<T>[] {
  const groupes: GroupeChapitre<T>[] = []
  items.forEach((item, index) => {
    const chapitreId = chapitreIdDe(item)
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.chapitreId === chapitreId) {
      dernier.entrees.push(item)
    } else {
      groupes.push({
        cle: `${chapitreId ?? 'sans-chapitre'}#${index}`,
        chapitreId,
        chapitreNom: chapitreNomDe(item),
        entrees: [item],
      })
    }
  })
  return groupes
}
