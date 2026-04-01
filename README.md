# Redwood Disc Golf Club — League Tracker

A local web app for tracking disc golf league results. No server required — runs entirely in the browser.

---

## Getting Started

### Option A — Open directly in browser
Just double-click `index.html`. It will open in your default browser and work immediately.

### Option B — Live Server in VS Code (recommended)
1. Install the **Live Server** extension (by Ritwick Dey) from the VS Code marketplace
2. Right-click `index.html` in the Explorer panel
3. Select **"Open with Live Server"**
4. The app opens at `http://127.0.0.1:5500` with auto-reload on save

---

## Project Structure

```
rdgc/
├── index.html   — App shell, navigation, modal markup
├── style.css    — All styling and CSS variables
├── app.js       — Data logic, rendering, event listeners
└── README.md    — This file
```

---

## How to Use

### Uploading a score sheet
1. Go to the **+ Upload** tab
2. Click or drag your `.xlsx` / `.xls` file onto the upload zone
3. Your file should be structured as:
   - **Row 1:** Header row (labels — content is ignored)
   - **Column A:** Player names (one per row)
   - **Columns B onward:** Hole scores (one column per hole)
4. Click **"Configure & Save Event"**
5. Fill in the event name, course, date, and hole format:
   - **9 / 18 holes:** Standard layouts, just enter optional par per hole
   - **Custom:** Set the total hole count, then name each hole and enter par
6. Hit **Save Event** — the event appears on the Calendar page

### Viewing results
- **Calendar tab:** All events listed newest-first. Click any event to see the full scorecard sorted best → worst, with hole-by-hole highlighting (green = best score on that hole, red = highest)
- **Players tab:** Browse all players, search by name. Click a player to see their full history across all events

### Player profiles
- Click any player name in a scorecard to jump directly to their profile
- Profile shows events played, best score, average, and win count

---

## Data Storage

All data is saved to your browser's **localStorage** under the key `rdgcV3`.  
This means:
- Data persists between sessions in the same browser
- Clearing browser data will erase events
- Data is not shared between different browsers or devices

To back up your data, open the browser console and run:
```js
copy(localStorage.getItem('rdgcV3'))
```
Then paste into a `.json` file. To restore, run:
```js
localStorage.setItem('rdgcV3', '<paste your JSON here>')
```

---

## Excel Format Example

| Name        | Hole 1 | Hole 2 | Hole 3 | ... |
|-------------|--------|--------|--------|-----|
| Alice Smith | 3      | 4      | 3      | ... |
| Bob Jones   | 4      | 3      | 5      | ... |
| Carol White | 3      | 3      | 4      | ... |

The header row content doesn't matter — only the player rows are read.

---

## Dependencies

Loaded via CDN (internet connection required on first load, then cached):
- [SheetJS (xlsx 0.18.5)](https://sheetjs.com/) — Excel file parsing
- [Playfair Display + Source Sans 3](https://fonts.google.com/) — Typography
