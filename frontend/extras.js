// ============================================================
// AURORA — EXTRAS
//   1. Clears the previous user's likes / history when you log out
//   2. Remembers your volume
//   3. Resumes the last song (paused) when you reopen Aurora
//   4. "Now playing" tab title
//   5. Media keys + lock-screen / notification controls
//
// Loaded after script.js — it only uses things script.js already has.
// ============================================================

(function () {

    const LAST_KEY = "auroraLastPlayed";
    const VOLUME_KEY = "auroraVolume";
    const BASE_TITLE = document.title;

    const hasAudio = () => typeof audio !== "undefined" && audio;
    const hasSession = () => "mediaSession" in navigator;

    function readJSON(key) {

        try {
            return JSON.parse(localStorage.getItem(key) || "null");
        } catch {
            return null;
        }

    }

    function write(key, value) {

        try {
            localStorage.setItem(key, value);
        } catch {
            // Storage can be unavailable (private mode / full) — not fatal.
        }

    }


    // ------------------------------------------------------------
    // 1. LOGOUT CLEANUP
    // Likes and history are cached in this browser. Without this,
    // the previous person's songs stay visible after logging out.
    // ------------------------------------------------------------

    function clearPersonalData() {

        try {
            localStorage.removeItem("auroraLikedTracks");
            localStorage.removeItem("auroraRecentlyPlayed");
            localStorage.removeItem(LAST_KEY);
        } catch {
            // ignore
        }

        if (typeof likedTracks !== "undefined") likedTracks = [];
        if (typeof recentlyPlayed !== "undefined") recentlyPlayed = [];

        // Un-fill every heart that's currently on screen.
        document.querySelectorAll(".track-like.liked").forEach(button => {

            button.classList.remove("liked");

            const icon = button.querySelector("i");
            if (icon) icon.className = "fa-regular fa-heart";

        });

        if (typeof updateLikeButton === "function") updateLikeButton();
        if (typeof renderLibrary === "function") renderLibrary();

    }

    window.addEventListener("aurora:auth-changed", () => {

        const loggedIn = Boolean(window.AuroraAuth && window.AuroraAuth.isLoggedIn());

        if (!loggedIn) {
            clearPersonalData();
        }

    });


    // ------------------------------------------------------------
    // 2. VOLUME MEMORY
    // ------------------------------------------------------------

    function restoreVolume() {

        if (!hasAudio()) return;

        const saved = parseFloat(localStorage.getItem(VOLUME_KEY));

        if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {

            audio.volume = saved;

            if (typeof volumeBar !== "undefined" && volumeBar) {
                volumeBar.value = saved;
            }

        }

    }

    function watchVolume() {

        audio.addEventListener("volumechange", () => {
            write(VOLUME_KEY, String(audio.volume));
        });

    }


    // ------------------------------------------------------------
    // 3. RESUME THE LAST SONG
    // ------------------------------------------------------------

    function saveLast() {

        if (typeof currentTrack === "undefined" || !currentTrack) return;

        write(LAST_KEY, JSON.stringify({
            track: currentTrack,
            time: audio.currentTime || 0
        }));

    }

    function restoreLastTrack() {

        if (typeof currentTrack === "undefined" || currentTrack) return;

        const saved = readJSON(LAST_KEY);
        const track = saved && saved.track;

        if (!track || !track.id || !track.streamUrl) return;

        currentTrack = track;
        queue = [track];
        currentIndex = 0;

        if (typeof updatePlayerUI === "function") {
            updatePlayerUI(track);
        }

        // Load it (paused) so pressing play continues where you left off.
        audio.src = track.streamUrl;

        const resumeAt = Number(saved.time) || 0;

        if (resumeAt > 1) {

            audio.addEventListener("loadedmetadata", function applyResume() {

                audio.removeEventListener("loadedmetadata", applyResume);

                if (Number.isFinite(audio.duration) && resumeAt < audio.duration - 2) {
                    audio.currentTime = resumeAt;
                }

            });

        }

    }


    // ------------------------------------------------------------
    // 4 + 5. TAB TITLE AND MEDIA SESSION
    // ------------------------------------------------------------

    function absoluteUrl(url) {

        try {
            return new URL(url, location.href).href;
        } catch {
            return url;
        }

    }

    function updateTitle() {

        if (hasAudio() && !audio.paused && typeof currentTrack !== "undefined" && currentTrack) {
            document.title = `${currentTrack.title} • ${currentTrack.artist}`;
        } else {
            document.title = BASE_TITLE;
        }

    }

    function updateMetadata() {

        if (!hasSession() || typeof MediaMetadata === "undefined") return;
        if (typeof currentTrack === "undefined" || !currentTrack) return;

        try {

            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrack.title || "Unknown track",
                artist: currentTrack.artist || "",
                album: "Aurora",
                artwork: currentTrack.artwork
                    ? [{ src: absoluteUrl(currentTrack.artwork), sizes: "512x512" }]
                    : []
            });

        } catch (error) {
            console.warn("Media session metadata failed:", error);
        }

    }

    function updatePositionState() {

        if (!hasSession() || !navigator.mediaSession.setPositionState) return;
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

        try {

            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(audio.currentTime, audio.duration)
            });

        } catch {
            // Some browsers reject odd values — safe to ignore.
        }

    }

    function setPlaybackState(state) {

        if (hasSession()) {
            navigator.mediaSession.playbackState = state;
        }

    }

    function seekBy(seconds) {

        if (!Number.isFinite(audio.duration)) return;

        audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));

    }

    function registerMediaKeys() {

        if (!hasSession()) return;

        const actions = {

            play: () => {
                audio.play().catch(() => {});
            },

            pause: () => audio.pause(),

            previoustrack: () => {
                if (typeof playPrevious === "function") playPrevious();
            },

            nexttrack: () => {
                if (typeof playNext === "function") playNext();
            },

            seekbackward: details => seekBy(-((details && details.seekOffset) || 10)),

            seekforward: details => seekBy((details && details.seekOffset) || 10),

            seekto: details => {
                if (details && Number.isFinite(details.seekTime)) {
                    audio.currentTime = details.seekTime;
                }
            }

        };

        Object.entries(actions).forEach(([name, handler]) => {

            try {
                navigator.mediaSession.setActionHandler(name, handler);
            } catch {
                // This browser doesn't support that action — fine.
            }

        });

    }


    // ------------------------------------------------------------
    // WIRE EVERYTHING UP
    // ------------------------------------------------------------

    if (hasAudio()) {

        restoreVolume();
        watchVolume();
        restoreLastTrack();
        registerMediaKeys();

        let lastSavedSecond = -10;
        let lastPositionSecond = -1;

        audio.addEventListener("play", () => {

            updateMetadata();
            updateTitle();
            setPlaybackState("playing");
            saveLast();

        });

        audio.addEventListener("pause", () => {

            updateTitle();
            setPlaybackState("paused");
            saveLast();

        });

        audio.addEventListener("ended", () => {
            setPlaybackState("none");
        });

        audio.addEventListener("loadedmetadata", updatePositionState);

        audio.addEventListener("timeupdate", () => {

            const second = Math.floor(audio.currentTime);

            if (second !== lastPositionSecond) {
                lastPositionSecond = second;
                updatePositionState();
            }

            if (Math.abs(second - lastSavedSecond) >= 5) {
                lastSavedSecond = second;
                saveLast();
            }

        });

        window.addEventListener("pagehide", saveLast);

    }

})();