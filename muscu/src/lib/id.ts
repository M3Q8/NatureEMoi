let counter = 0

/**
 * Identifiant unique. (crypto.randomUUID n'existe pas quand l'app est ouverte
 * en http:// sur le Wi-Fi local, d'où ce générateur maison.)
 */
export function uid(): string {
  counter = (counter + 1) % 1_000_000
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
