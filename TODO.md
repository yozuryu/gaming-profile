# TODO / Idea Stash

Ideas to implement later. Read this before starting new admin panel work.

---

## Admin Panel

### Steam — Manual Beaten Flag
Steam has no native "beaten" concept. Need a way to manually mark Steam games as beaten.

**Problem with "use latest achievement unlock date" approach:** when a new achievement is unlocked after the game was beaten, the beaten date shifts forward incorrectly.

**Suggested approach:** store beaten date explicitly in a manually maintained JSON (e.g. `data/steam/beaten.json` — `{ appId: "YYYY-MM-DD" }`). Admin panel UI: game list with a "Mark as Beaten" button + date picker; editing an existing entry shows the saved date. Pipeline should never overwrite this file.

### RA Series Hub Management
Create a series grouping map so games can be grouped by franchise/series — primarily for the watchlist.

**What's needed:**
- A `data/ra/series.json` mapping series name → array of game IDs (or titles)
- Admin panel editor: create/rename/delete series, drag games in/out of a series
- Watchlist view would use this map to group entries by series instead of flat alphabetical

---
