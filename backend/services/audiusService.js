const AUDIUS_API_URL =
    process.env.AUDIUS_API_URL || "https://api.audius.co/v1";

const AUDIUS_BEARER_TOKEN =
    process.env.AUDIUS_BEARER_TOKEN || "";


// ============================================================
// BUILD A URL AGAINST THE AUDIUS API
// ============================================================

function buildAudiusUrl(endpoint, params = {}) {

    const url = new URL(`${AUDIUS_API_URL}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {

        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }

    });

    return url;

}


// ============================================================
// REQUEST AUDIUS
// ============================================================

async function audiusRequest(endpoint, params = {}) {

    const url = buildAudiusUrl(endpoint, params);

    const headers = { Accept: "application/json" };

    // API key is optional for read-only requests
    if (AUDIUS_BEARER_TOKEN) {
        headers.Authorization = `Bearer ${AUDIUS_BEARER_TOKEN}`;
    }

    const response = await fetch(url, { headers });
    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = null;
    }

    if (!response.ok) {

        const message =
            data?.message ||
            data?.error ||
            `${response.status} ${response.statusText}`;

        throw new Error(`Audius API: ${message}`);

    }

    return data;

}


// ============================================================
// TRACK HELPERS
// ============================================================

function getTrackId(track) {
    return track?.track_id ?? track?.id ?? null;
}

function getArtist(track) {
    return (
        track?.user?.name ||
        track?.user?.handle ||
        track?.artist?.name ||
        "Unknown Artist"
    );
}

function getArtwork(track) {

    const artwork = track?.artwork || {};

    return (
        artwork["1000x1000"] ||
        artwork["480x480"] ||
        artwork["150x150"] ||
        artwork["mirrors"]?.[0] ||
        null
    );

}


// ============================================================
// FORMAT ONE / MANY TRACKS
// ============================================================

function formatTrack(track) {

    const id = getTrackId(track);

    return {
        id,
        title: track?.title || "Unknown Track",
        artist: getArtist(track),
        artistHandle: track?.user?.handle || "",
        duration: Number(track?.duration || 0),
        artwork: getArtwork(track),
        genre: track?.genre || "Music",
        mood: track?.mood || "",
        releaseDate: track?.release_date || track?.releaseDate || null,
        playCount: Number(track?.play_count || track?.playCount || 0),
        favoriteCount: Number(track?.favorite_count || track?.favoriteCount || 0),
        repostCount: Number(track?.repost_count || track?.repostCount || 0),
        isAvailable: track?.is_available !== false,
        isStreamable: track?.access?.stream !== false,
        permalink: track?.permalink || null,
        streamUrl: id ? `/api/stream/${encodeURIComponent(id)}` : null
    };

}

function formatTracks(data) {

    return (Array.isArray(data) ? data : [])
        .map(formatTrack)
        .filter(track => track.id && track.isAvailable && track.isStreamable);

}

module.exports = {
    AUDIUS_API_URL,
    AUDIUS_BEARER_TOKEN,
    buildAudiusUrl,
    audiusRequest,
    getTrackId,
    getArtist,
    getArtwork,
    formatTrack,
    formatTracks
};
