# Aurora — Music App

Aurora is a music-streaming web app. It streams independent artists from the
[Audius](https://audius.co) open music catalog, and lets you create an account to save
liked songs, playlists and listening history.

> Aurora plays independent-artist music. It does not carry major-label chart music, and
> it is not affiliated with Spotify, YouTube or any major label.

## Features

- Browse trending and latest music, by genre and by mood
- Search with genre filter and recent searches
- Accounts (sign up, log in, change password, delete account)
- Liked songs, listening history, playlists (create, edit, add and remove songs, play all, shuffle)
- Artist pages, queue, profile page with stats
- Keyboard shortcuts (press `?` in the app), media-key support, resume last song

## Tech

| Part     | Technology                              |
| -------- | --------------------------------------- |
| Frontend | HTML, CSS and vanilla JavaScript        |
| Backend  | Node.js + Express (also serves the frontend) |
| Database | PostgreSQL with Prisma 7                |
| Music    | Audius API                              |

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

Every later time you work on Aurora: start Docker Desktop, run `docker compose up -d`
in `backend`, then `npm start`. (`start.bat` runs the last step for you.)

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
| `TRUST_PROXY`    | Number of proxies in front of the app (use `1` on most hosts)                  |
| `CORS_ORIGINS`   | Other websites allowed to call the API (normally empty)                        |
| `CSP_MODE`       | `report-only` logs Content-Security-Policy problems instead of blocking        |

**Never commit `.env`.** It is already listed in `.gitignore`; `.env.example` is the safe template.

## Security notes

- Passwords are hashed with bcrypt; sessions use signed tokens that expire after 30 days
- Login, signup, password-change and account-deletion are rate limited
- Security headers (including a Content-Security-Policy) are set with Helmet
- The server refuses to start in production with a weak `JWT_SECRET`
