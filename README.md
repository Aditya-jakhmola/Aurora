# Aurora — Music Streaming App

**Live demo:** https://aurora-8huy.onrender.com
*(Free hosting: the first visit after a quiet period takes about a minute to wake up.)*

Aurora is a full-stack music streaming web app. It streams independent artists from the
[Audius](https://audius.co) open music catalog, and lets you create an account to save liked
songs, playlists and listening history.

> Aurora plays independent-artist music. It does not carry major-label chart music, and it is
> not affiliated with Spotify, YouTube or any major label.

## Features

- **Discover:** trending and latest music, browsable by genre and mood
- **Search:** with a genre filter and recent searches
- **Artist pages:** photo, bio, follower count and tracks
- **Accounts:** sign up, log in, change password, delete account
- **Library:** liked songs and listening history, saved to your account
- **Playlists:** create, edit, add and remove songs, cover art, play all, shuffle
- **Player:** play queue, shuffle and repeat, resume your last song, remembers your volume
- **Shortcuts:** keyboard shortcuts (press `?` in the app) and media-key / system media controls
- **Responsive:** works on phones and desktops

## Tech stack

| Part     | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | HTML, CSS and vanilla JavaScript (no framework) |
| Backend  | Node.js + Express (REST API, also serves the frontend) |
| Database | PostgreSQL with Prisma 7                     |
| Music    | Audius API (audio is streamed through the server, so no keys reach the browser) |
| Hosting  | Render (app) + Neon (database)               |

## How it works

```text
Browser ──► Express server ──► PostgreSQL   accounts, likes, playlists, history
                  │
                  └──────────► Audius API   catalog, search, audio streams
```

- 25 REST endpoints across music, auth, likes, playlists and history
- 5 database tables (users, likes, playlists, playlist tracks, history) managed with Prisma migrations
- Login uses JWT tokens and bcrypt-hashed passwords

## Project layout

```text
Aurora/
├── frontend/              the website (index.html, style.css, *.js, assets/)
├── backend/
│   ├── server.js          app entry point
│   ├── routes/            API routes (music, auth, likes, playlists, history)
│   ├── middleware/        login checks, security headers, rate limits
│   ├── services/          Audius helpers
│   ├── lib/               Prisma client
│   ├── prisma/            database schema + migrations
│   ├── .env.example       copy to .env and fill in
│   └── docker-compose.yml local PostgreSQL
├── render.yaml            deployment config for Render
├── start.bat              Windows shortcut to start the app
└── README.md
```

## Run it locally

You need **Node.js 20.19+** (or 22.12+ / 24), **Docker Desktop**, and Git.

```powershell
# 1. Create your settings file
cd backend
copy .env.example .env
# Open .env and set JWT_SECRET. Generate one with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Start the database (Docker Desktop must be running)
docker compose up -d

# 3. Install, set up the database, and start
npm install
npm run build        # generates the Prisma client and applies the migrations
npm start
```

Then open <http://localhost:5000>. Health check: <http://localhost:5000/api/health>.

Every later time: start Docker Desktop, run `docker compose up -d` in `backend`, then `npm start`.

### Changing the database schema

1. Edit `backend/prisma/schema.prisma`
2. Stop the server, then in `backend` run `npx prisma migrate dev --name what_you_changed`
3. Run `npx prisma generate` (Prisma 7 does not do this automatically)
4. Start the server again

## Settings (`backend/.env`)

| Variable         | What it does                                                                   |
| ---------------- | ------------------------------------------------------------------------------ |
| `PORT`           | Port to listen on (default 5000)                                               |
| `NODE_ENV`       | `development` locally, `production` on a server                                |
| `DATABASE_URL`   | PostgreSQL connection string                                                   |
| `JWT_SECRET`     | Signs login tokens. **In production it must be 32+ random characters** or the server refuses to start |
| `AUDIUS_API_URL` | Audius API address                                                             |
| `AUDIUS_BEARER_TOKEN` | Optional Audius token. Never put it in a frontend file                    |
| `TRUST_PROXY`    | Number of proxies in front of the app (set to `3` on Render in `render.yaml`)  |
| `CORS_ORIGINS`   | Other websites allowed to call the API (normally empty)                        |
| `CSP_MODE`       | `report-only` logs Content-Security-Policy problems instead of blocking        |
| `DEBUG_IP`       | `true` temporarily enables `/api/debug/ip` for checking visitor addresses      |

**Never commit `.env`.** It is already in `.gitignore`; `.env.example` is the safe template.

## Deploy (Render + Neon, free)

1. **Neon:** create a project, turn off connection pooling in *Connect*, copy the connection string
   (the host must not contain `-pooler`) and make sure it ends with `?sslmode=require`.
2. **Render:** *New + → Blueprint*, pick this repository. Render reads `render.yaml`, asks for
   `DATABASE_URL` (paste the Neon string) and deploys. The build runs `npm run build`, which
   creates the database tables. Every `git push` redeploys automatically.
3. Put your real site address in the `og:image` / `twitter:image` tags in `frontend/index.html`
   (link previews need a full `https://...` URL).

## Security

- Passwords are hashed with bcrypt; sessions use signed tokens that expire after 30 days
- Login, signup, password-change and account-deletion are rate limited
- Security headers and a Content-Security-Policy are set with Helmet
- The server refuses to start in production with a weak `JWT_SECRET`
- Signup input is validated; login timing doesn't reveal which accounts exist

## Known limitations

- The catalog is independent artists on Audius only. There is no major-label music.
- The free host puts the app to sleep when idle, so the first request can be slow.
- No email verification or password-reset email yet.
- Rate-limit counters are kept in memory, which suits a single server.
- No automated test suite yet.

## Ideas for later

- Password reset by email
- Automated tests and a CI check on every push
- Drag-and-drop reordering inside playlists

## Credits and license

Music and artwork come from the [Audius](https://audius.co) API and belong to the artists who
uploaded them. Aurora's code is released under the [MIT License](LICENSE).
