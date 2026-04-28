# Momentum Timer

An ADHD-friendly focus timer PWA with momentum-building stages (2 → 5 → 8 → 15 → 30 minutes), XP rewards, confetti celebrations, audio chimes, vibration, and push notifications.

## Stack
- **Frontend:** React 18 + Vite 5
- **PWA:** vite-plugin-pwa with a custom service worker (`public/sw.js`) for offline caching and notifications
- **Styling:** Plain CSS + inline styles (no framework)
- **Runtime:** Node.js 20

## Project Layout
```
.
├── index.html              Vite entry HTML
├── vite.config.js          Vite + PWA config (port 5000, host 0.0.0.0, allowedHosts)
├── package.json
├── public/
│   ├── sw.js               Service worker (cache + push notifications)
│   └── icons/              PWA icons (SVG)
└── src/
    ├── main.jsx            React entry, registers SW
    ├── index.css           Global styles + animations
    └── App.jsx             Main app (timer state machine + UI screens)
```

## Running
- Dev server: `npm run dev` (auto-started by the **Start application** workflow on port 5000)
- Build: `npm run build`
- Preview: `npm run preview`

## Replit Setup Notes
- Vite is configured with `host: 0.0.0.0`, `port: 5000`, and `allowedHosts: true` so the proxied iframe preview works.
- A single workflow (`Start application`) runs `npm run dev` on port 5000 (webview).
