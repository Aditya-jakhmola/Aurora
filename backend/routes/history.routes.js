const express = require("express");

const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function formatHistoryItem(item) {
    return {
        id: item.trackId,
        title: item.title,
        artist: item.artist,
        artwork: item.artwork,
        duration: item.duration,
        streamUrl: `/api/stream/${encodeURIComponent(item.trackId)}`,
        playedAt: item.playedAt
    };
}


// ============================================================
// GET RECENTLY PLAYED
// ============================================================

router.get("/", requireAuth, async (req, res) => {

    try {

        const items = await prisma.historyItem.findMany({
            where: { userId: req.userId },
            orderBy: { playedAt: "desc" },
            take: 50
        });

        res.json({ success: true, tracks: items.map(formatHistoryItem) });

    } catch (error) {

        console.error("Fetch history error:", error.message);
        res.status(500).json({ success: false, error: "Unable to fetch listening history." });

    }

});


// ============================================================
// RECORD A PLAY
// ============================================================

router.post("/", requireAuth, async (req, res) => {

    try {

        const { trackId, title, artist, artwork, duration } = req.body || {};

        if (!trackId) {
            return res.status(400).json({ success: false, error: "trackId is required." });
        }

        await prisma.historyItem.create({
            data: {
                userId: req.userId,
                trackId,
                title: title || "Unknown Track",
                artist: artist || "Unknown Artist",
                artwork: artwork || null,
                duration: Number(duration) || 0
            }
        });

        // Trim old history so the table doesn't grow forever:
        // keep only the most recent 100 rows per user.
        const overflow = await prisma.historyItem.findMany({
            where: { userId: req.userId },
            orderBy: { playedAt: "desc" },
            skip: 100,
            select: { id: true }
        });

        if (overflow.length) {
            await prisma.historyItem.deleteMany({
                where: { id: { in: overflow.map(row => row.id) } }
            });
        }

        res.status(201).json({ success: true });

    } catch (error) {

        console.error("Record history error:", error.message);
        res.status(500).json({ success: false, error: "Unable to record this play." });

    }

});

module.exports = router;
