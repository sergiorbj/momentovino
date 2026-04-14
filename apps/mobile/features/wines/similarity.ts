/**
 * Wine similarity for list grouping. Must stay in sync with apps/web/api/_wine_match.py (MATCH_THRESHOLD).
 */
import type { Database } from '../../lib/database.types'

export type WineRow = Database['public']['Tables']['wines']['Row']

export const MATCH_THRESHOLD = 0.76

export function normalize(s: string | null | undefined): string {
  if (!s) return ''
  const t = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t
}

function tokenJaccard(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean))
  const tb = new Set(b.split(/\s+/).filter(Boolean))
  if (ta.size === 0 && tb.size === 0) return 1
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const x of ta) {
    if (tb.has(x)) inter++
  }
  return inter / (ta.size + tb.size - inter)
}

/** 0..1 — same formula as Python `_wine_match.similarity_score` */
export function wineSimilarityScore(
  name: string,
  producer: string | null | undefined,
  country: string | null | undefined,
  existing: WineRow
): number {
  const nc = normalize(country ?? undefined)
  const ec = normalize(existing.country ?? undefined)
  if (nc && ec && nc !== ec) return 0

  const nn = normalize(name)
  const en = normalize(existing.name)
  if (!nn || !en) return 0

  const m = nn.length
  const n = en.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = nn[i - 1] === en[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      )
    }
  }
  const dist = dp[m]![n]!
  const char = 1 - dist / Math.max(m, n, 1)

  const tok = tokenJaccard(nn, en)
  const nameS = Math.max(char, tok)

  const np = normalize(producer ?? undefined)
  const ep = normalize(existing.producer ?? undefined)
  let prodS: number
  if (np && ep) {
    const pm = np.length
    const pn = ep.length
    const dpp: number[][] = Array.from({ length: pm + 1 }, () => Array(pn + 1).fill(0))
    for (let i = 0; i <= pm; i++) dpp[i]![0] = i
    for (let j = 0; j <= pn; j++) dpp[0]![j] = j
    for (let i = 1; i <= pm; i++) {
      for (let j = 1; j <= pn; j++) {
        const cost = np[i - 1] === ep[j - 1] ? 0 : 1
        dpp[i]![j] = Math.min(
          dpp[i - 1]![j]! + 1,
          dpp[i]![j - 1]! + 1,
          dpp[i - 1]![j - 1]! + cost
        )
      }
    }
    const pd = dpp[pm]![pn]!
    prodS = Math.max(1 - pd / Math.max(pm, pn, 1), tokenJaccard(np, ep))
  } else if (!np && !ep) {
    prodS = 1
  } else {
    prodS = 0.55
  }

  return 0.68 * nameS + 0.32 * prodS
}

export type WineCluster = {
  /** Oldest registration in the group — stable display name from your cellar */
  canonical: WineRow
  members: WineRow[]
}

/**
 * Group likely-duplicate wines (same person, fuzzy name/producer/country).
 * Oldest `created_at` row becomes canonical (keeps the name you stored first).
 */
export function clusterWinesForDisplay(rows: WineRow[]): WineCluster[] {
  if (rows.length === 0) return []
  const asc = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const clusters: WineRow[][] = []
  for (const row of asc) {
    let placed = false
    for (const cl of clusters) {
      const hit = cl.some((m) => wineSimilarityScore(row.name, row.producer, row.country, m) >= MATCH_THRESHOLD)
      if (hit) {
        cl.push(row)
        placed = true
        break
      }
    }
    if (!placed) clusters.push([row])
  }
  const out: WineCluster[] = clusters.map((members) => {
    const canonical = members.reduce((a, b) =>
      new Date(a.created_at) <= new Date(b.created_at) ? a : b
    )
    return { canonical, members }
  })
  out.sort((a, b) => {
    const ta = Math.max(...a.members.map((m) => new Date(m.created_at).getTime()))
    const tb = Math.max(...b.members.map((m) => new Date(m.created_at).getTime()))
    return tb - ta
  })
  return out
}

/** Prefer the most recent non-null label photo in the cluster for the row avatar */
export function bestLabelPhotoInCluster(members: WineRow[]): string | null {
  const withPhoto = [...members]
    .filter((m) => m.label_photo_url)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return withPhoto[0]?.label_photo_url ?? null
}
