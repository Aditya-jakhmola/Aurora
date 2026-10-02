# Aurora — Music App

Aurora is a music-streaming web app built with HTML, CSS, JavaScript, Node.js and the Audius open music catalog.

## Current architecture

```text
Aurora/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
├── start.bat
└── README.md
```

The old local MP3/cover files are intentionally not used by Aurora anymore. Music, artwork, search results and streaming are loaded from the Audius API at runtime.

## Run Aurora

### Option A — easiest

Double-click `start.bat`.

### Option B — VS Code terminal

```powershell
cd backend
npm install
npm start
```

Then open:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

You do **not** need VS Code Live Server for this version. The Node/Express backend serves the frontend itself.

## API key

Read-only Audius requests can work without credentials. The `.env` file is prepared so an Audius bearer token can be added later if needed for higher limits or authenticated features.

Never put a bearer token in `frontend/script.js` or any browser-visible file.
