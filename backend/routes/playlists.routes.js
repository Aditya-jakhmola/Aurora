const express = require("express");

const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function formatTrackRow(row) {
    return {
        rowId: row.id,
        id: row.trackId,
        title: row.title,
        artist: row.artist,
        artwork: row.artwork,
        duration: row.duration,
        streamUrl: `/api/stream/${encodeURIComponent(row.trackId)}`
    };
}

function formatPlaylist(playlist) {
    return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        createdAt: playlist.createdAt,
        tracks: (playlist.tracks || []).map(formatTrackRow)
    };
}


// ============================================================
// LIST MY PLAYLISTS
// ============================================================

router.get("/", requireAuth, async (req, res) => {

    try {

        const playlists = await prisma.playlist.findMany({
            where: { userId: req.userId },
            include: { tracks: { orderBy: { position: "asc" } } },
            orderBy: { createdAt: "desc" }
        });

        res.json({ success: true, playlists: playlists.map(formatPlaylist) });

    } catch (error) {

        console.error("Fetch playlists error:", error.message);
        res.status(500).json({ success: false, error: "Unable to fetch playlists." });

    }

});


// ============================================================
// CREATE A PLAYLIST
// ============================================================

router.post("/", requireAuth, async (req, res) => {

    try {

        const { name, description } = req.body || {};

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, error: "Playlist name is required." });
        }

        const playlist = await prisma.playlist.create({
            data: {
                userId: req.userId,
                name: String(name).trim(),
                description: description ? String(description).trim() : null
            }
        });

        res.status(201).json({
            success: true,
            playlist: formatPlaylist({ ...playlist, tracks: [] })
        });

    } catch (error) {

        console.error("Create playlist error:", error.message);
        res.status(500).json({ success: false, error: "Unable to create playlist." });

    }

});


// ============================================================
// DELETE A PLAYLIST
// ============================================================

router.delete("/:playlistId", requireAuth, async (req, res) => {

    try {

        const { playlistId } = req.params;

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId: req.userId }
        });

        if (!playlist) {
            return res.status(404).json({ success: false, error: "Playlist not found." });
        }

        await prisma.playlist.delete({ where: { id: playlistId } });

        res.json({ success: true });

    } catch (error) {

        console.error("Delete playlist error:", error.message);
        res.status(500).json({ success: false, error: "Unable to delete playlist." });

    }

});


// ============================================================
// ADD A TRACK TO A PLAYLIST
// ============================================================

router.post("/:playlistId/tracks", requireAuth, async (req, res) => {

    try {

        const { playlistId } = req.params;
        const { trackId, title, artist, artwork, duration } = req.body || {};

        if (!trackId) {
            return res.status(400).json({ success: false, error: "trackId is required." });
        }

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId: req.userId }
        });

        if (!playlist) {
            return res.status(404).json({ success: false, error: "Playlist not found." });
        }

        const position = await prisma.playlistTrack.count({ where: { playlistId } });

        const track = await prisma.playlistTrack.create({
            data: {
                playlistId,
                trackId,
                title: title || "Unknown Track",
                artist: artist || "Unknown Artist",
                artwork: artwork || null,
                duration: Number(duration) || 0,
                position
            }
        });

        res.status(201).json({ success: true, track: formatTrackRow(track) });

    } catch (error) {

        console.error("Add track to playlist error:", error.message);
        res.status(500).json({ success: false, error: "Unable to add track to playlist." });

    }

});


// ============================================================
// REMOVE A TRACK FROM A PLAYLIST
// ============================================================

router.delete("/:playlistId/tracks/:rowId", requireAuth, async (req, res) => {

    try {

        const { playlistId, rowId } = req.params;

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId: req.userId }
        });

        if (!playlist) {
            return res.status(404).json({ success: false, error: "Playlist not found." });
        }

        await prisma.playlistTrack.deleteMany({
            where: { id: rowId, playlistId }
        });

        res.json({ success: true });

    } catch (error) {

        console.error("Remove track from playlist error:", error.message);
        res.status(500).json({ success: false, error: "Unable to remove track." });

    }

});

module.exports = router;
