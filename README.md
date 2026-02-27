# 🐼 HSK Kids – Learn Mandarin

A kid-friendly, static Mandarin learning web app for ages **5–10**.  
No server required – runs entirely in the browser with offline support via a Service Worker.

---

## Features

- **Two tracks**: Pre-reader (5–7) – emoji & audio focus; Reader (8–10) – Chinese + pinyin + English
- **100 vocabulary items** across 10 fun themes (Greetings, Numbers, Colors, Animals, Food, Family, School, Body Parts, Feelings, Actions)
- **4 activities**: Tap the Picture · Listen & Find · Flashcards · Parent Corner
- **Offline support** via Service Worker precaching
- **Progress tracking** in `localStorage` (stars per theme, total stars)
- No external images – uses emoji throughout

---

## How to run locally

### Option A – just open the file

```bash
# Clone or download the repository, then open directly:
open index.html
```

> ⚠️ Service Workers require HTTPS or `localhost`. For full offline support use Option B.

### Option B – local HTTP server (recommended)

```bash
# Python 3 (built-in)
cd /path/to/hsk-kids
python3 -m http.server 8080
# then open http://localhost:8080
```

```bash
# Node.js with npx
npx serve .
```

---

## How to enable GitHub Pages

1. Push your code to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under *Source*, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder.
5. Click **Save**. GitHub will publish the app at `https://<username>.github.io/<repo>/`.

All asset paths in the app are **relative** (`./styles.css`, `./app.js`, etc.) so the app works under any subdirectory automatically.

---

## Offline notes

- After the first page load the Service Worker (`sw.js`) caches:  
  `index.html`, `styles.css`, `app.js`, `themes.js`, `manifest.json`
- Subsequent visits and all four activities work **fully offline**.
- Speech synthesis (`SpeechSynthesis` API) requires an active internet connection on some devices/browsers to download the voice. Once a voice is cached by the OS it may work offline too.
- The app displays an offline banner when `navigator.onLine` is `false`.

---

## Project structure

```
hsk-kids/
├── index.html      # App shell – all screens
├── styles.css      # Mobile-first styling + animations
├── app.js          # State management + activity logic
├── themes.js       # 100-item vocabulary dataset
├── manifest.json   # PWA manifest
├── sw.js           # Service worker (offline caching)
└── README.md
```

---

## Data persistence

Progress (track selection, stars, per-theme scores, settings) is stored in **`localStorage`** under the key `hskKidsState`. It is local to the device – no account or cloud sync required.  
Use the **Parent Corner** (⚙️ button) to reset progress.
