const express = require("express");

const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function formatLike(like) {
    return {
        id: like.trackId,
        title: like.title,
        artist: like.artist,
        artwork: like.artwork,
        duration: like.duration,
        streamUrl: `/api/stream/${encodeURIComponent(like.trackId)}`,
        likedAt: like.createdAt
    };
}


// ============================================================
// GET ALL LIKED SONGS
// ============================================================

router.get("/", requireAuth, async (req, res) => {

    try {

        const likes = await prisma.like.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: "desc" }
        });

        res.json({ success: true, tracks: likes.map(formatLike) });

    } catch (error) {

        console.error("Fetch likes error:", error.message);
        res.status(500).json({ success: false, error: "Unable to fetch liked songs." });

    }

});


// ============================================================
// LIKE A TRACK
// ============================================================

router.post("/:trackId", requireAuth, async (req, res) => {

    try {

        const { trackId } = req.params;
        const { title, artist, artwork, duration } = req.body || {};

        const like = await prisma.like.upsert({
            where: {
                userId_trackId: { userId: req.userId, trackId }
            },
            update: {},
            create: {
                userId: req.userId,
                trackId,
                title: title || "Unknown Track",
                artist: artist || "Unknown Artist",
                artwork: artwork || null,
                duration: Number(duration) || 0
            }
        });

        res.status(201).json({ success: true, track: formatLike(like) });

    } catch (error) {

        console.error("Like track error:", error.message);
        res.status(500).json({ success: false, error: "Unable to like this track." });

    }

});


// ============================================================
// UNLIKE A TRACK
// ============================================================

router.delete("/:trackId", requireAuth, async (req, res) => {

    try {

        const { trackId } = req.params;

        await prisma.like.deleteMany({
            where: { userId: req.userId, trackId }
        });

        res.json({ success: true });

    } catch (error) {

        console.error("Unlike track error:", error.message);
        res.status(500).json({ success: false, error: "Unable to unlike this track." });

    }

});

module.exports = router;
