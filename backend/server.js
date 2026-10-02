const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const audiusRoutes = require("./routes/audius.routes");
const authRoutes = require("./routes/auth.routes");
const likesRoutes = require("./routes/likes.routes");
const playlistsRoutes = require("./routes/playlists.routes");
const historyRoutes = require("./routes/history.routes");

const app = express();

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// Serve frontend from this backend
app.use(express.static(FRONTEND_DIR));


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
// START SERVER
// ============================================================

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("            AURORA BACKEND");
    console.log("======================================");
    console.log(`Aurora:   http://localhost:${PORT}`);
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log(`Database: ${process.env.DATABASE_URL ? "configured" : "NOT configured"}`);
    console.log("======================================");
    console.log("");

});
