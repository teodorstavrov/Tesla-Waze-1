const KEY = 'ev_favorites'

export function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')) } catch { return new Set() }
}

export function toggleFavorite(id: string): Set<string> {
  const favs = loadFavorites()
  if (favs.has(id)) { favs.delete(id) } else { favs.add(id) }
  localStorage.setItem(KEY, JSON.stringify([...favs]))
  return favs
}
