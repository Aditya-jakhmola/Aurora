const express = require("express");
const { Readable } = require("stream");

const {
    AUDIUS_API_URL,
    AUDIUS_BEARER_TOKEN,
    buildAudiusUrl,
    audiusRequest,
    formatTrack,
    formatTracks,
    formatArtist
} = require("../services/audiusService");

const router = express.Router();


// ============================================================
// HEALTH
// ============================================================

router.get("/health", (req, res) => {

    res.json({
        success: true,
        app: "Aurora",
        message: "Aurora backend is running",
        audiusApi: AUDIUS_API_URL,
        apiKeyConfigured: Boolean(AUDIUS_BEARER_TOKEN)
    });

});


// ============================================================
// TRENDING MUSIC
// ============================================================

router.get("/trending", async (req, res) => {

    try {

        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const time = req.query.time || "week";
        const genre = req.query.genre || "";

        const result = await audiusRequest("/tracks/trending", { limit, offset, time, genre });

        res.json({ success: true, tracks: formatTracks(result?.data) });

    } catch (error) {

        console.error("Trending error:", error.message);

        res.status(502).json({
            success: false,
            error: "Unable to fetch trending music from Audius."
        });

    }

});


// ============================================================
// LATEST MUSIC
// ============================================================

router.get("/latest", async (req, res) => {

    try {

        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const result = await audiusRequest("/tracks/latest", { limit, offset });

        res.json({ success: true, tracks: formatTracks(result?.data) });

    } catch (error) {

        console.error("Latest error:", error.message);

        res.status(502).json({
            success: false,
            error: "Unable to fetch latest music from Audius."
        });

    }

});


// ============================================================
// SEARCH MUSIC
// ============================================================

router.get("/search", async (req, res) => {

    try {

        const query = String(req.query.q || "").trim();
        const genre = req.query.genre || "";

        if (!query) {
            return res.json({ success: true, query: "", tracks: [] });
        }

        const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const sortMethod = ["relevant", "popular", "recent"].includes(req.query.sort_method)
            ? req.query.sort_method
            : "relevant";

        console.log(`Searching Audius for: "${query}"${genre ? ` (genre: ${genre})` : ""}`);

        const result = await audiusRequest("/tracks/search", {
            query,
            genre,
            limit,
            offset,
            sort_method: sortMethod
        });

        const normalizedQuery = query.toLowerCase().trim();

        const tracks = formatTracks(result?.data)
            .map((track, index) => {

                const title = track.title.toLowerCase();
                const artist = track.artist.toLowerCase();

                let score = 0;

                if (title === normalizedQuery) score += 1000;
                if (title.startsWith(normalizedQuery)) score += 250;
                if (title.includes(normalizedQuery)) score += 100;
                if (artist === normalizedQuery) score += 300;
                if (artist.includes(normalizedQuery)) score += 100;

                // Preserve Audius ranking
                score += Math.max(0, 50 - index);

                return { track, score };

            })
            .sort((a, b) => b.score - a.score)
            .map(item => item.track);

        console.log(`Search returned ${tracks.length} tracks`);

        res.json({ success: true, query, tracks });

    } catch (error) {

        console.error("Search error:", error);

        res.status(502).json({
            success: false,
            error: "Unable to search Audius right now."
        });

    }

});


// ============================================================
// GET ONE TRACK
// ============================================================

router.get("/tracks/:id", async (req, res) => {

    try {

        const trackId = encodeURIComponent(req.params.id);

        const result = await audiusRequest(`/tracks/${trackId}`);

        if (!result?.data) {
            return res.status(404).json({ success: false, error: "Track not found." });
        }

        res.json({ success: true, track: formatTrack(result.data) });

    } catch (error) {

        console.error("Track error:", error.message);

        res.status(502).json({ success: false, error: "Unable to fetch this track." });

    }

});


// ============================================================
// GET ONE ARTIST
// ============================================================

router.get("/artists/:id", async (req, res) => {

    try {

        const artistId = encodeURIComponent(req.params.id);

        const result = await audiusRequest(`/users/${artistId}`);

        if (!result?.data) {
            return res.status(404).json({ success: false, error: "Artist not found." });
        }

        res.json({ success: true, artist: formatArtist(result.data) });

    } catch (error) {

        console.error("Artist error:", error.message);

        res.status(502).json({ success: false, error: "Unable to fetch this artist." });

    }

});


// ============================================================
// GET AN ARTIST'S TRACKS
// ============================================================

router.get("/artists/:id/tracks", async (req, res) => {

    try {

        const artistId = encodeURIComponent(req.params.id);
        const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const result = await audiusRequest(`/users/${artistId}/tracks`, { limit, offset });

        res.json({ success: true, tracks: formatTracks(result?.data) });

    } catch (error) {

        console.error("Artist tracks error:", error.message);

        res.status(502).json({ success: false, error: "Unable to fetch this artist's tracks." });

    }

});


// ============================================================
// STREAM MUSIC
// ============================================================

router.get("/stream/:id", async (req, res) => {

    try {

        const trackId = encodeURIComponent(req.params.id);
        const url = buildAudiusUrl(`/tracks/${trackId}/stream`);

        const headers = {};

        if (AUDIUS_BEARER_TOKEN) {
            headers.Authorization = `Bearer ${AUDIUS_BEARER_TOKEN}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok || !response.body) {
            return res.status(response.status || 502).json({
                success: false,
                error: "This track is not available for streaming."
            });
        }

        const contentType = response.headers.get("content-type");
        const contentLength = response.headers.get("content-length");
        const acceptRanges = response.headers.get("accept-ranges");

        if (contentType) res.setHeader("Content-Type", contentType);
        if (contentLength) res.setHeader("Content-Length", contentLength);
        if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

        res.setHeader("Cache-Control", "no-store");

        Readable.fromWeb(response.body).pipe(res);

    } catch (error) {

        console.error("Stream error:", error.message);

        if (!res.headersSent) {
            res.status(502).json({ success: false, error: "Unable to stream this track." });
        } else {
            res.end();
        }

    }

});

module.exports = router;
