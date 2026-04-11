# Completions — Page Context

## Data Sources
- `../data/ra/profile.json` — awards from `pageAwards.visibleUserAwards`
- `../data/steam/profile.json` — `perfectGames` array

## Normalization
Two normalizers in `app.js`:
- `normalizeRA(awards, showBeaten)` — returns entries with `type: 'mastered'` or `type: 'beaten'`, keyed by `gameId: a.awardData`
- `normalizeSteam(perfectGames)` — returns entries with `type: 'perfect'`

## Deduplication
RA entries are deduplicated by `gameId` in the `completions` useMemo — a game that is both mastered and beaten only appears once, as `mastered`. Logic: build a Map keyed by `gameId`, insert beaten first, then overwrite with mastered if present.

## Display
- Entries grouped by month (`groupByMonth`), then grouped by year for rendering
- `showBeaten` toggle controls whether beaten-only games appear
- Platform filter: All / RA / Steam
- Hidden tags filter (Homebrew, Demo, Prototype, Hack tilde tags)
- Mastered/Perfect → gold `#e5b143`. Beaten → `#8f98a0` gray.

## Terminology
- RA Mastered = full 100% achievement completion (hardcore)
- Steam Perfect = 100% achievements unlocked
- Both are the same concept — "Completed" — shown with gold color
- RA Beaten = game story completed without full achievement set — shown with gray color
