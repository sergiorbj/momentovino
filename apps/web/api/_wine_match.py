"""Wine similarity for deduping scans. Keep thresholds in sync with apps/mobile/features/wines/similarity.ts"""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Optional

# Must match apps/mobile/features/wines/similarity.ts MATCH_THRESHOLD
MATCH_THRESHOLD = 0.72


def _lev_ratio(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    dist = dp[m][n]
    return 1.0 - dist / max(m, n, 1)


def normalize(s: Optional[str]) -> str:
    if not s:
        return ""
    t = unicodedata.normalize("NFKD", str(s).lower().strip())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _brand_prefix_bonus(nn: str, en: str) -> float:
    a = [t for t in nn.split() if t]
    b = [t for t in en.split() if t]
    if len(a) < 2 or len(b) < 2:
        return 0.0
    lim = min(3, len(a), len(b))
    i = 0
    while i < lim and a[i] == b[i]:
        i += 1
    if i < 2:
        return 0.0
    return min(0.14, 0.07 * (i - 1))


def _token_jaccard(a: str, b: str) -> float:
    ta = set(a.split())
    tb = set(b.split())
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def similarity_score(
    name: str,
    producer: Optional[str],
    country: Optional[str],
    existing: dict[str, Any],
) -> float:
    nc = normalize(country)
    ec = normalize(existing.get("country"))
    if nc and ec and nc != ec:
        return 0.0

    nn = normalize(name)
    en = normalize(existing.get("name"))
    if not nn or not en:
        return 0.0

    char = _lev_ratio(nn, en)
    tok = _token_jaccard(nn, en)
    name_s = min(1.0, max(char, tok) + _brand_prefix_bonus(nn, en))

    np = normalize(producer)
    ep = normalize(existing.get("producer"))
    if np and ep:
        prod_s = max(_lev_ratio(np, ep), _token_jaccard(np, ep))
    elif not np and not ep:
        prod_s = 1.0
    else:
        prod_s = 0.55

    combined = 0.68 * name_s + 0.32 * prod_s
    # Same wine re-scanned: name matches strongly but producer string may differ (brand vs estate).
    if name_s >= 0.88:
        combined = max(combined, 0.755)
    return min(combined, 1.0)


def find_matching_wine(
    rows: list[dict[str, Any]],
    name: str,
    producer: Optional[str],
    country: Optional[str],
) -> Optional[dict[str, Any]]:
    best: Optional[dict[str, Any]] = None
    best_score = 0.0
    for row in rows:
        s = similarity_score(name, producer, country, row)
        if s > best_score:
            best_score = s
            best = row
    if best is not None and best_score >= MATCH_THRESHOLD:
        return best
    return None
