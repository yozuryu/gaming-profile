# Activity — Page Context

## Data Sources
- `../data/ra/achievements/heatmap.json` + `../data/steam/achievements/heatmap.json` — fetched on mount
- `../data/ra/achievements/1.json` + `../data/steam/achievements/1.json` — fetched on mount
- `../data/ra/achievements/2–4.json` + `../data/steam/achievements/2–4.json` — lazy-loaded via IntersectionObserver (300px rootMargin)

All RA/Steam achievements are normalized to a unified shape via `utils/normalizers.js`:
- `normalizeRA()` → `{ platform, gameId, gameName, achievementName, icon, unlockedAt, points, tags, ... }`
- `normalizeSteam()` → same shape

## Key Features

### Heatmap
- 365-day GitHub-style grid
- Filterable by platform (All / RA / Steam)
- RA peak color: `#e5b143` (gold). Steam peak color: `#66c0f4` (blue).
- `overflow-x: auto` wrapper with `minWidth: ${53 * 14}px` inner — intentional, do not change.

### Streak Panel
- Below heatmap
- 14-day circle timeline, current/longest streak, animated flame icons (`flameFlicker` keyframe) on active days
- Gold connectors between consecutive active days
- Today is **never** counted as a streak break — the streak holds until the day ends with no achievements

### Timeline
- Achievement groups: by day → by game → individual achievements
- Lazy-loads chunks 2–4 via IntersectionObserver with sentinel `ref` at bottom of list
- `loadedChunkCount` tracks how many chunks are loaded; `loadingChunkIdx` tracks in-flight fetch

## CSS Animations
Defined in `<style>` tag inside the React return (established pattern):
- `flameFlicker` — flame icon wiggle on active streak days
- `pendingPulse` — border pulse on today's circle if no achievements yet
- `streakGlow` — glow on streak count number
