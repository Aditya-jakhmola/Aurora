const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const security = require("./middleware/security");

const audiusRoutes = require("./routes/audius.routes");
const authRoutes = require("./routes/auth.routes");
const likesRoutes = require("./routes/likes.routes");
const playlistsRoutes = require("./routes/playlists.routes");
const historyRoutes = require("./routes/history.routes");

const app = express();

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const MODE = process.env.NODE_ENV === "production" ? "production" : "development";


// ============================================================
// MIDDLEWARE
// ============================================================

app.set("trust proxy", security.trustProxySetting());

app.use(security.securityHeaders());
app.use(security.corsMiddleware());
app.use(express.json({ limit: "100kb" }));

// Serve frontend from this backend
app.use(express.static(FRONTEND_DIR));


// ============================================================
// RATE LIMITS
// ============================================================

app.use("/api", security.apiLimiter);

app.post("/api/auth/login", security.loginLimiter);
app.post("/api/auth/register", security.registerLimiter);
app.patch("/api/auth/password", security.sensitiveLimiter);
app.delete("/api/auth/account", security.sensitiveLimiter);


// ============================================================
// PRIVATE RESPONSES ARE NEVER CACHED
// ============================================================

["/api/auth", "/api/likes", "/api/playlists", "/api/history"].forEach(prefix => {
    app.use(prefix, security.noStore);
});


// ============================================================
// OPTIONAL: check what address the server sees for you.
// Off unless DEBUG_IP=true. Used once after deploying to confirm
// TRUST_PROXY is right (see README), then switched off again.
// ============================================================

if (process.env.DEBUG_IP === "true") {

    app.get("/api/debug/ip", (req, res) => {

        res.json({
            ip: req.ip,
            forwardedFor: req.headers["x-forwarded-for"] || null,
            trustProxy: app.get("trust proxy")
        });

    });

}


// ============================================================
// ROUTES
// ============================================================

// Audius-backed music catalog: /api/health, /api/trending, /api/latest,
// /api/search, /api/tracks/:id, /api/stream/:id
app.use("/api", audiusRoutes);

// Accounts: /api/auth/register, /api/auth/login, /api/auth/me
app.use("/api/auth", authRoutes);

// Liked songs, saved per account: /api/likes
app.use("/api/likes", likesRoutes);

// Playlists, saved per account: /api/playlists
app.use("/api/playlists", playlistsRoutes);

// Recently played, saved per account: /api/history
app.use("/api/history", historyRoutes);


// ============================================================
// FRONTEND
// ============================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});


// ============================================================
// UNKNOWN ROUTES
// ============================================================

app.use((req, res) => {

    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ success: false, error: "API route not found" });
    }

    res.sendFile(path.join(FRONTEND_DIR, "index.html"));

});


// ============================================================
// ERRORS (must come last)
// ============================================================

app.use(security.errorHandler);


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("            AURORA BACKEND");
    console.log("======================================");
    console.log(`Aurora:   http://localhost:${PORT}`);
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log(`Mode:     ${MODE}`);
    console.log(`Database: ${process.env.DATABASE_URL ? "configured" : "NOT configured"}`);
    console.log("======================================");
    console.log("");

});
