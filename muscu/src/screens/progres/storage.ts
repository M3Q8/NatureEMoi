/** Petites préférences d'affichage (onglet, exercice choisi) : sans importance si elles se perdent. */
export function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* navigation privée */
  }
}
